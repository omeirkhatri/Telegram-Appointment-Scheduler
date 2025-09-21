import { NextRequest } from 'next/server';
import { GET as initiateHandler } from '@/app/api/google-calendar/initiate/route';
import { GET as callbackHandler } from '@/app/api/google-calendar/callback/route';
import { config } from '@/lib/env';
import { generateOAuthState, validateOAuthState } from '@/lib/googleOAuthState';

// Mock the environment configuration
jest.mock('@/lib/env', () => ({
  config: {
    googleCalendar: {
      isConfigured: jest.fn(() => true),
      isEnabled: jest.fn(() => true),
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/api/google-calendar/callback',
      encryptionKey: 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1jaGFycy1sb25n'
    },
    supabase: {
      url: 'https://test.supabase.co',
      serviceRoleKey: 'test-service-role-key'
    },
    security: {
      jwtSecret: 'test-jwt-secret-for-signing'
    }
  }
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          error: null
        }))
      }))
    }))
  }))
}));

// Mock fetch for Google API calls
global.fetch = jest.fn();

describe('Google Calendar OAuth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/api/google-calendar/initiate', () => {
    it('should generate OAuth URL when properly configured', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-calendar/initiate');
      const response = await initiateHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.oauthUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(data.oauthUrl).toContain('client_id=test-client-id');
      expect(data.oauthUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fgoogle-calendar%2Fcallback');
      expect(data.oauthUrl).toContain('response_type=code');
      expect(data.oauthUrl).toContain('access_type=offline');
      expect(data.oauthUrl).toContain('prompt=consent');
      expect(data.state).toBeDefined();
    });

    it('should include staff ID in state when provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-calendar/initiate?staff_id=test-staff-123');
      const response = await initiateHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.staffId).toBe('test-staff-123');
      
      // Validate that the state contains the staff ID
      const statePayload = validateOAuthState(data.state);
      expect(statePayload.staffId).toBe('test-staff-123');
    });

    it('should include redirect URL in state when provided', async () => {
      const redirectUrl = 'http://localhost:3000/dashboard';
      const request = new NextRequest(`http://localhost:3000/api/google-calendar/initiate?redirect_url=${encodeURIComponent(redirectUrl)}`);
      const response = await initiateHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.redirectUrl).toBe(redirectUrl);
      
      // Validate that the state contains the redirect URL
      const statePayload = validateOAuthState(data.state);
      expect(statePayload.redirectUrl).toBe(redirectUrl);
    });

    it('should return error when Google Calendar is not configured', async () => {
      (config.googleCalendar.isConfigured as jest.Mock).mockReturnValue(false);
      
      const request = new NextRequest('http://localhost:3000/api/google-calendar/initiate');
      const response = await initiateHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Google Calendar not configured');
    });

    it('should return error when Google Calendar sync is disabled', async () => {
      (config.googleCalendar.isEnabled as jest.Mock).mockReturnValue(false);
      
      const request = new NextRequest('http://localhost:3000/api/google-calendar/initiate');
      const response = await initiateHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Google Calendar sync disabled');
    });
  });

  describe('/api/google-calendar/callback', () => {
    it('should handle OAuth errors by redirecting to error page', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-calendar/callback?error=access_denied&error_description=User%20denied%20access');
      const response = await callbackHandler(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/api/google-calendar/error');
      expect(response.headers.get('location')).toContain('error=access_denied');
    });

    it('should return error when authorization code is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-calendar/callback');
      const response = await callbackHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing authorization code');
    });

    it('should return error when state parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-calendar/callback?code=test-code');
      const response = await callbackHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing state parameter');
    });

    it('should return error when state token is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-calendar/callback?code=test-code&state=invalid-state');
      const response = await callbackHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid state token');
    });

    it('should return error when state token is expired', async () => {
      // Create an expired state token
      const expiredState = generateOAuthState({ expiresInMs: -1000 }); // Expired 1 second ago
      
      const request = new NextRequest(`http://localhost:3000/api/google-calendar/callback?code=test-code&state=${expiredState}`);
      const response = await callbackHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid state token');
    });

    it('should successfully exchange code for tokens and store them', async () => {
      // Mock successful token exchange
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'https://www.googleapis.com/auth/calendar'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            email: 'test@example.com',
            name: 'Test User'
          })
        });

      // Create a valid state token
      const state = generateOAuthState({ staffId: 'test-staff-123' });
      
      const request = new NextRequest(`http://localhost:3000/api/google-calendar/callback?code=test-code&state=${state}`);
      const response = await callbackHandler(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/api/google-calendar/success');
      expect(response.headers.get('location')).toContain('calendar_id=test%40example.com');
      expect(response.headers.get('location')).toContain('staff_id=test-staff-123');

      // Verify that fetch was called for token exchange
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.stringContaining('client_id=test-client-id')
        })
      );

      // Verify that fetch was called for user info
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-access-token',
          },
        })
      );
    });

    it('should handle token exchange failure', async () => {
      // Mock failed token exchange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'invalid_grant' })
      });

      const state = generateOAuthState({ staffId: 'test-staff-123' });
      
      const request = new NextRequest(`http://localhost:3000/api/google-calendar/callback?code=test-code&state=${state}`);
      const response = await callbackHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Token exchange failed');
    });

    it('should handle user info fetch failure', async () => {
      // Mock successful token exchange but failed user info fetch
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'https://www.googleapis.com/auth/calendar'
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized'
        });

      const state = generateOAuthState({ staffId: 'test-staff-123' });
      
      const request = new NextRequest(`http://localhost:3000/api/google-calendar/callback?code=test-code&state=${state}`);
      const response = await callbackHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to get user info');
    });

    it('should redirect to custom redirect URL when provided', async () => {
      // Mock successful token exchange
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'https://www.googleapis.com/auth/calendar'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            email: 'test@example.com',
            name: 'Test User'
          })
        });

      const redirectUrl = 'http://localhost:3000/dashboard';
      const state = generateOAuthState({ 
        staffId: 'test-staff-123',
        redirectUrl 
      });
      
      const request = new NextRequest(`http://localhost:3000/api/google-calendar/callback?code=test-code&state=${state}`);
      const response = await callbackHandler(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain(redirectUrl);
      expect(response.headers.get('location')).toContain('success=true');
      expect(response.headers.get('location')).toContain('calendar_id=test%40example.com');
      expect(response.headers.get('location')).toContain('staff_id=test-staff-123');
    });
  });
});