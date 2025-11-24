import { config } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { CreateLead, GoogleSheetsSyncLog, Lead } from '@/types/lead';
import { google } from 'googleapis';
import { LeadService } from './leadService';

export class GoogleSheetsLeadService {
  private static sheets: any;
  private static initialized = false;

  /**
   * Initialize Google Sheets API
   */
  private static async initializeSheets() {
    if (this.initialized) return;

    try {
      // Initialize Google Sheets API
      const auth = new google.auth.GoogleAuth({
        keyFile: config.googleSheets.credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Google Sheets API: ${error}`);
    }
  }

  /**
   * Sync leads from Google Sheets
   */
  static async syncLeadsFromGoogleSheets(): Promise<{ newLeads: number; errors: string[] }> {
    await this.initializeSheets();

    const errors: string[] = [];
    let newLeads = 0;

    // Create sync log entry
    const syncLogId = await this.createSyncLog();

    try {
      // Get data from Google Sheets
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSheets.sheetId,
        range: config.googleSheets.range,
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        await this.updateSyncLog(syncLogId, 'completed', rows.length, 0, null);
        return { newLeads: 0, errors: [] };
      }

      // Skip header row if it exists
      const dataRows = rows.slice(1);

      for (let i = 0; i < dataRows.length; i++) {
        try {
          const row = dataRows[i];
          const rowId = `row_${i + 2}`; // +2 because we skipped header and arrays are 0-indexed

          // Check if lead already exists
          const existingLead = await this.checkDuplicateLead(row, rowId);
          if (existingLead) {
            continue; // Skip if lead already exists
          }

          // Parse row data
          const leadData = this.parseSheetRow(row, rowId);
          if (!leadData) {
            errors.push(`Row ${i + 2}: Invalid data format`);
            continue;
          }

          // Create lead
          await LeadService.createLead(leadData, 'system'); // System user for automated creation
          newLeads++;

        } catch (error) {
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      await this.updateSyncLog(syncLogId, 'completed', rows.length, newLeads, errors.length > 0 ? errors : null);

    } catch (error) {
      await this.updateSyncLog(syncLogId, 'failed', 0, 0, [error instanceof Error ? error.message : 'Unknown error']);
      throw error;
    }

    return { newLeads, errors };
  }

  /**
   * Parse a row from Google Sheets into lead data
   */
  private static parseSheetRow(row: any[], rowId: string): CreateLead | null {
    try {
      // Expected columns: Name, Phone, Email, Service, Address, WhatsApp
      const [name, phone, email, service, address, whatsapp] = row;

      if (!name || !phone) {
        return null; // Name and phone are required
      }

      // Parse address if provided
      let flat_villa_no = '';
      let building_street = '';
      let area = '';
      let city = '';

      if (address) {
        const addressParts = address.split(',').map((part: string) => part.trim());
        if (addressParts.length >= 4) {
          flat_villa_no = addressParts[0];
          building_street = addressParts[1];
          area = addressParts[2];
          city = addressParts[3];
        } else {
          // If address format is different, put it all in building_street
          building_street = address;
        }
      }

      return {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || undefined,
        service_interested_in: service?.trim() || undefined,
        flat_villa_no: flat_villa_no || undefined,
        building_street: building_street || undefined,
        area: area || undefined,
        city: city || undefined,
        whatsapp_number: whatsapp?.trim() || undefined,
        has_whatsapp: !!whatsapp,
        source: 'google_sheets',
        google_sheet_row_id: rowId,
        stage: 'new',
        status: 'active',
      };
    } catch (error) {
      console.error('Error parsing sheet row:', error);
      return null;
    }
  }

  /**
   * Check if lead already exists based on phone or Google Sheet row ID
   */
  private static async checkDuplicateLead(row: any[], rowId: string): Promise<Lead | null> {
    const phone = row[1]; // Phone is in second column

    if (!phone) return null;

    // Check by phone number
    const { data: existingByPhone } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', phone.trim())
      .single();

    if (existingByPhone) return existingByPhone;

    // Check by Google Sheet row ID
    const { data: existingByRowId } = await supabase
      .from('leads')
      .select('*')
      .eq('google_sheet_row_id', rowId)
      .single();

    return existingByRowId;
  }

  /**
   * Create sync log entry
   */
  private static async createSyncLog(): Promise<string> {
    const { data, error } = await supabase
      .from('google_sheets_sync_log')
      .insert({
        sync_started_at: new Date().toISOString(),
        status: 'running',
        rows_processed: 0,
        new_leads_created: 0,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create sync log: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update sync log entry
   */
  private static async updateSyncLog(
    id: string,
    status: 'completed' | 'failed',
    rowsProcessed: number,
    newLeadsCreated: number,
    errors: string[] | null
  ): Promise<void> {
    const { error } = await supabase
      .from('google_sheets_sync_log')
      .update({
        sync_completed_at: new Date().toISOString(),
        status,
        rows_processed: rowsProcessed,
        new_leads_created: newLeadsCreated,
        errors: errors ? { errors } : null,
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to update sync log:', error);
    }
  }

  /**
   * Get last sync status
   */
  static async getLastSyncStatus(): Promise<GoogleSheetsSyncLog | null> {
    const { data, error } = await supabase
      .from('google_sheets_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw new Error(`Failed to get last sync status: ${error.message}`);
    }

    return data;
  }

  /**
   * Get sync history
   */
  static async getSyncHistory(limit: number = 10): Promise<GoogleSheetsSyncLog[]> {
    const { data, error } = await supabase
      .from('google_sheets_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get sync history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Test Google Sheets connection
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.initializeSheets();

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: config.googleSheets.sheetId,
      });

      return {
        success: true,
        message: `Connected to spreadsheet: ${response.data.properties?.title || 'Unknown'}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get spreadsheet info
   */
  static async getSpreadsheetInfo(): Promise<{
    title: string;
    sheets: Array<{ title: string; id: number }>;
  }> {
    await this.initializeSheets();

    const response = await this.sheets.spreadsheets.get({
      spreadsheetId: config.googleSheets.sheetId,
    });

    return {
      title: response.data.properties?.title || 'Unknown',
      sheets: response.data.sheets?.map((sheet: any) => ({
        title: sheet.properties?.title || 'Unknown',
        id: sheet.properties?.sheetId || 0,
      })) || [],
    };
  }
}



