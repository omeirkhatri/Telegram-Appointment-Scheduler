import type { Staff } from '@/types';

// Google Calendar API service for staff integration
export class GoogleCalendarService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY || '';
  }

  // Validate Google Calendar ID format
  validateCalendarId(calendarId: string): boolean {
    // Google Calendar IDs can be email addresses or special IDs
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const specialIdRegex = /^[a-zA-Z0-9._-]+@group\.calendar\.google\.com$/;

    return emailRegex.test(calendarId) || specialIdRegex.test(calendarId);
  }

  // Test Google Calendar connection
  async testCalendarConnection(calendarId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}?key=${this.apiKey}`,
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to test calendar connection:', error);
      return false;
    }
  }

  // Get calendar events for a staff member
  async getCalendarEvents(
    calendarId: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?` +
        `timeMin=${startDate}&timeMax=${endDate}&key=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      throw error;
    }
  }

  // Create calendar event for staff member
  async createCalendarEvent(
    calendarId: string,
    eventData: {
      summary: string;
      description: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      location?: string;
    },
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to create calendar event: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  // Update calendar event
  async updateCalendarEvent(
    calendarId: string,
    eventId: string,
    eventData: {
      summary?: string;
      description?: string;
      start?: { dateTime: string; timeZone: string };
      end?: { dateTime: string; timeZone: string };
      location?: string;
    },
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?key=${this.apiKey}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update calendar event: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  // Delete calendar event
  async deleteCalendarEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?key=${this.apiKey}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to delete calendar event: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  // Check staff availability for a time slot
  async checkStaffAvailability(
    staff: Staff,
    startTime: string,
    endTime: string,
    date: string,
  ): Promise<boolean> {
    if (!staff.google_calendar_id) {
      return true; // No calendar integration, assume available
    }

    try {
      const events = await this.getCalendarEvents(
        staff.google_calendar_id,
        `${date}T${startTime}:00Z`,
        `${date}T${endTime}:00Z`,
      );

      // Check for conflicting events
      const conflictingEvents = events.filter((event: any) => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        const requestedStart = new Date(`${date}T${startTime}:00Z`);
        const requestedEnd = new Date(`${date}T${endTime}:00Z`);

        // Check for overlap
        return eventStart < requestedEnd && eventEnd > requestedStart;
      });

      return conflictingEvents.length === 0;
    } catch (error) {
      console.error('Failed to check staff availability:', error);
      return false; // Assume unavailable if we can't check
    }
  }

  // Get staff calendar events for a date range
  async getStaffCalendarEvents(
    staff: Staff,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    if (!staff.google_calendar_id) {
      return [];
    }

    try {
      return await this.getCalendarEvents(staff.google_calendar_id, startDate, endDate);
    } catch (error) {
      console.error('Failed to get staff calendar events:', error);
      return [];
    }
  }

  // Sync staff calendar events with database
  async syncStaffCalendar(staff: Staff, startDate: string, endDate: string): Promise<void> {
    if (!staff.google_calendar_id) {
      return;
    }

    try {
      const events = await this.getCalendarEvents(staff.google_calendar_id, startDate, endDate);

      // Here you would sync the events with your database
      // This is a placeholder for the actual sync logic
      console.log(`Syncing ${events.length} events for staff ${staff.id}`);

      // TODO: Implement actual sync logic with appointments table
    } catch (error) {
      console.error('Failed to sync staff calendar:', error);
      throw error;
    }
  }

  // Set up calendar webhook for a staff member
  async setupCalendarWebhook(calendarId: string, webhookUrl: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/watch?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: `webhook-${Date.now()}`,
            type: 'web_hook',
            address: webhookUrl,
            params: {
              ttl: '2592000', // 30 days
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to setup calendar webhook: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Failed to setup calendar webhook:', error);
      throw error;
    }
  }

  // Stop calendar webhook
  async stopCalendarWebhook(calendarId: string, webhookId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/stop?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: webhookId,
            resourceId: webhookId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to stop calendar webhook: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to stop calendar webhook:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;
