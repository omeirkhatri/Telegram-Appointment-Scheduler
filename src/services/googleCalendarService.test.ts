import { GoogleCalendarService } from './googleCalendarService';
import { googleCalendarAuth } from '@/lib/googleCalendarAuth';

// Mock the googleapis library
jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn(() => ({
      events: {
        list: jest.fn(),
        insert: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
        watch: jest.fn(),
        stop: jest.fn(),
      },
      calendars: {
        get: jest.fn(),
      },
      calendarList: {
        list: jest.fn(),
      },
    })),
  },
}));

// Mock the authentication module
jest.mock('@/lib/googleCalendarAuth', () => ({
  googleCalendarAuth: {
    initializeServiceAccount: jest.fn(),
    initializeApiKey: jest.fn(),
    getCalendarClient: jest.fn(),
    validateCalendarId: jest.fn(),
    testCalendarAccess: jest.fn(),
    getCalendarList: jest.fn(),
    refreshToken: jest.fn(),
    hasServiceAccountAuth: jest.fn(),
    hasApiKeyAuth: jest.fn(),
  },
}));

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let mockCalendarClient: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock calendar client
    mockCalendarClient = {
      events: {
        list: jest.fn(),
        insert: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
        watch: jest.fn(),
        stop: jest.fn(),
      },
      calendars: {
        get: jest.fn(),
      },
      calendarList: {
        list: jest.fn(),
      },
    };

    (googleCalendarAuth.getCalendarClient as jest.Mock).mockResolvedValue(mockCalendarClient);
    (googleCalendarAuth.initializeServiceAccount as jest.Mock).mockResolvedValue(undefined);
    (googleCalendarAuth.initializeApiKey as jest.Mock).mockImplementation(() => {});
    (googleCalendarAuth.validateCalendarId as jest.Mock).mockReturnValue(true);
    (googleCalendarAuth.testCalendarAccess as jest.Mock).mockResolvedValue(true);
    (googleCalendarAuth.getCalendarList as jest.Mock).mockResolvedValue([]);
    (googleCalendarAuth.refreshToken as jest.Mock).mockResolvedValue(undefined);
    (googleCalendarAuth.hasServiceAccountAuth as jest.Mock).mockReturnValue(false);
    (googleCalendarAuth.hasApiKeyAuth as jest.Mock).mockReturnValue(true);

    service = new GoogleCalendarService();
  });

  describe('validateCalendarId', () => {
    it('should delegate to authentication module', () => {
      service.validateCalendarId('test@example.com');
      
      expect(googleCalendarAuth.validateCalendarId).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('testCalendarConnection', () => {
    it('should test calendar access', async () => {
      const result = await service.testCalendarConnection('test@example.com');
      
      expect(googleCalendarAuth.testCalendarAccess).toHaveBeenCalledWith('test@example.com');
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      (googleCalendarAuth.testCalendarAccess as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      const result = await service.testCalendarConnection('test@example.com');
      
      expect(result).toBe(false);
    });
  });

  describe('getCalendarEvents', () => {
    it('should fetch calendar events', async () => {
      const mockEvents = [{ id: '1', summary: 'Test Event' }];
      mockCalendarClient.events.list.mockResolvedValue({
        data: { items: mockEvents }
      });

      const result = await service.getCalendarEvents('test@example.com', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z');
      
      expect(mockCalendarClient.events.list).toHaveBeenCalledWith({
        calendarId: 'test@example.com',
        timeMin: '2024-01-01T00:00:00Z',
        timeMax: '2024-01-02T00:00:00Z',
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500
      });
      expect(result).toEqual(mockEvents);
    });

    it('should handle errors', async () => {
      mockCalendarClient.events.list.mockRejectedValue(new Error('API Error'));
      
      await expect(service.getCalendarEvents('test@example.com', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z'))
        .rejects.toThrow('API Error');
    });
  });

  describe('createCalendarEvent', () => {
    it('should create calendar event', async () => {
      const eventData = {
        summary: 'Test Event',
        description: 'Test Description',
        start: { dateTime: '2024-01-01T10:00:00+04:00', timeZone: 'Asia/Dubai' },
        end: { dateTime: '2024-01-01T11:00:00+04:00', timeZone: 'Asia/Dubai' },
      };

      mockCalendarClient.events.insert.mockResolvedValue({
        data: { id: 'event-123' }
      });

      const result = await service.createCalendarEvent('test@example.com', eventData);
      
      expect(mockCalendarClient.events.insert).toHaveBeenCalledWith({
        calendarId: 'test@example.com',
        requestBody: eventData,
        sendUpdates: 'all'
      });
      expect(result).toBe('event-123');
    });
  });

  describe('updateCalendarEvent', () => {
    it('should update calendar event', async () => {
      const eventData = {
        summary: 'Updated Event',
        description: 'Updated Description',
      };

      mockCalendarClient.events.patch.mockResolvedValue({});

      await service.updateCalendarEvent('test@example.com', 'event-123', eventData);
      
      expect(mockCalendarClient.events.patch).toHaveBeenCalledWith({
        calendarId: 'test@example.com',
        eventId: 'event-123',
        requestBody: eventData,
        sendUpdates: 'all'
      });
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should delete calendar event', async () => {
      mockCalendarClient.events.delete.mockResolvedValue({});

      await service.deleteCalendarEvent('test@example.com', 'event-123');
      
      expect(mockCalendarClient.events.delete).toHaveBeenCalledWith({
        calendarId: 'test@example.com',
        eventId: 'event-123',
        sendUpdates: 'all'
      });
    });
  });

  describe('getAuthStatus', () => {
    it('should return authentication status', () => {
      const status = service.getAuthStatus();
      
      expect(status).toHaveProperty('hasServiceAccount');
      expect(status).toHaveProperty('hasApiKey');
      expect(status).toHaveProperty('isInitialized');
    });
  });

  describe('refreshAuth', () => {
    it('should refresh authentication token', async () => {
      await service.refreshAuth();
      
      expect(googleCalendarAuth.refreshToken).toHaveBeenCalled();
    });
  });

  describe('getAvailableCalendars', () => {
    it('should get available calendars', async () => {
      const mockCalendars = [{ id: 'primary', summary: 'Primary Calendar' }];
      (googleCalendarAuth.getCalendarList as jest.Mock).mockResolvedValue(mockCalendars);

      const result = await service.getAvailableCalendars();
      
      expect(googleCalendarAuth.getCalendarList).toHaveBeenCalled();
      expect(result).toEqual(mockCalendars);
    });
  });
});
