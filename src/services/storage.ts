import { getServiceRoleClient, supabase } from '@/lib/supabase';

export interface UploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  fileId?: string;
}

export interface DocumentMetadata {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export class StorageService {
  private bucketName = 'patient-documents';

  // Get the appropriate Supabase client (service role for server-side operations)
  private getClient() {
    // If we're in a server environment, use service role client
    if (typeof window === 'undefined') {
      return getServiceRoleClient();
    }
    // Otherwise use the regular client for client-side operations
    return supabase;
  }

  /**
   * Upload a patient ID document
   */
  async uploadPatientDocument(
    patientId: string,
    file: File,
  ): Promise<UploadResult> {
    try {
      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/pdf',
        'image/webp',
      ];

      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, PDF, WebP',
        };
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'File size too large. Maximum size is 10MB',
        };
      }

      // Generate secure file path
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const timestamp = Date.now();
      const uuid = crypto.randomUUID();
      const fileName = `${patientId}_${timestamp}_${uuid}.${fileExtension}`;
      const filePath = `id-documents/${fileName}`;

      // Upload file to Supabase Storage
      const client = this.getClient();
      const { data, error } = await client.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        filePath: filePath,
        fileId: data.path,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get a signed URL for viewing a patient document
   */
  async getDocumentUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const client = this.getClient();
      const { data, error } = await client.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Error getting signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      return null;
    }
  }

  /**
   * Delete a patient document
   */
  async deletePatientDocument(filePath: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const { error } = await client.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting document:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  /**
   * List all documents for a patient
   */
  async listPatientDocuments(patientId: string): Promise<DocumentMetadata[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.storage
        .from(this.bucketName)
        .list('id-documents', {
          search: patientId,
        });

      if (error) {
        console.error('Error listing documents:', error);
        return [];
      }

      return data.map(file => ({
        id: file.id,
        name: file.name,
        size: file.metadata?.size || 0,
        mime_type: file.metadata?.mimetype || '',
        created_at: file.created_at,
        updated_at: file.updated_at,
      }));
    } catch (error) {
      console.error('List error:', error);
      return [];
    }
  }

  /**
   * Update patient document (replace existing file)
   */
  async updatePatientDocument(
    patientId: string,
    oldFilePath: string,
    newFile: File,
  ): Promise<UploadResult> {
    try {
      // First, delete the old file
      await this.deletePatientDocument(oldFilePath);

      // Then upload the new file
      return await this.uploadPatientDocument(patientId, newFile);
    } catch (error) {
      console.error('Update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, PDF, WebP',
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size too large. Maximum size is 10MB',
      };
    }

    return { isValid: true };
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const storageService = new StorageService();
