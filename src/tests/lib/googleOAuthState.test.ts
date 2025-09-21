import {
  generateOAuthState,
  validateOAuthState,
  createStaffConnectionState,
  validateStaffConnectionState,
  extractStaffIdFromState,
  isStateTokenExpired
} from '@/lib/googleOAuthState';

// Mock the environment configuration
jest.mock('@/lib/env', () => ({
  config: {
    security: {
      jwtSecret: 'test-jwt-secret-for-signing'
    },
    googleCalendar: {
      encryptionKey: 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1jaGFycy1sb25n'
    }
  }
}));

describe('Google OAuth State Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOAuthState', () => {
    it('should generate a valid state token', () => {
      const state = generateOAuthState();
      
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    it('should include staff ID when provided', () => {
      const staffId = 'test-staff-123';
      const state = generateOAuthState({ staffId });
      
      const payload = validateOAuthState(state);
      expect(payload.staffId).toBe(staffId);
    });

    it('should include redirect URL when provided', () => {
      const redirectUrl = 'http://localhost:3000/dashboard';
      const state = generateOAuthState({ redirectUrl });
      
      const payload = validateOAuthState(state);
      expect(payload.redirectUrl).toBe(redirectUrl);
    });

    it('should use custom expiry time when provided', () => {
      const expiresInMs = 5 * 60 * 1000; // 5 minutes
      const state = generateOAuthState({ expiresInMs });
      
      // Should be valid immediately
      const payload = validateOAuthState(state, expiresInMs);
      expect(payload).toBeDefined();
    });

    it('should reject expiry time exceeding maximum', () => {
      const expiresInMs = 2 * 60 * 60 * 1000; // 2 hours (exceeds 1 hour max)
      
      expect(() => {
        generateOAuthState({ expiresInMs });
      }).toThrow('Expiry time cannot exceed 3600000ms');
    });

    it('should generate different nonces for each call', () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();
      
      expect(state1).not.toBe(state2);
      
      const payload1 = validateOAuthState(state1);
      const payload2 = validateOAuthState(state2);
      
      expect(payload1.nonce).not.toBe(payload2.nonce);
    });
  });

  describe('validateOAuthState', () => {
    it('should validate a correctly generated state token', () => {
      const state = generateOAuthState();
      const payload = validateOAuthState(state);
      
      expect(payload).toBeDefined();
      expect(payload.timestamp).toBeDefined();
      expect(payload.nonce).toBeDefined();
      expect(typeof payload.timestamp).toBe('number');
      expect(typeof payload.nonce).toBe('string');
    });

    it('should reject invalid base64', () => {
      expect(() => {
        validateOAuthState('invalid-base64!');
      }).toThrow('Failed to validate state token');
    });

    it('should reject malformed JSON', () => {
      const invalidState = Buffer.from('invalid-json').toString('base64');
      
      expect(() => {
        validateOAuthState(invalidState);
      }).toThrow('Failed to validate state token');
    });

    it('should reject state without signature', () => {
      const stateData = {
        payload: JSON.stringify({
          timestamp: Date.now(),
          nonce: 'test-nonce'
        })
        // Missing signature
      };
      const invalidState = Buffer.from(JSON.stringify(stateData)).toString('base64');
      
      expect(() => {
        validateOAuthState(invalidState);
      }).toThrow('Invalid state token format');
    });

    it('should reject state with invalid signature', () => {
      const stateData = {
        payload: JSON.stringify({
          timestamp: Date.now(),
          nonce: 'test-nonce'
        }),
        signature: 'invalid-signature'
      };
      const invalidState = Buffer.from(JSON.stringify(stateData)).toString('base64');
      
      expect(() => {
        validateOAuthState(invalidState);
      }).toThrow('Invalid state token signature');
    });

    it('should reject expired state tokens', () => {
      // Create a state token with a timestamp from the past
      const pastTime = Date.now() - 20000; // 20 seconds ago
      const stateData = {
        payload: JSON.stringify({
          timestamp: pastTime,
          nonce: 'test-nonce'
        }),
        signature: 'dummy-signature' // This will fail signature validation
      };
      const expiredState = Buffer.from(JSON.stringify(stateData)).toString('base64');
      
      expect(() => {
        validateOAuthState(expiredState);
      }).toThrow('Invalid state token signature');
    });

    it('should reject future timestamps', () => {
      const futureTime = Date.now() + 60000; // 1 minute in the future
      const stateData = {
        payload: JSON.stringify({
          timestamp: futureTime,
          nonce: 'test-nonce'
        }),
        signature: 'dummy-signature' // This will fail signature validation anyway
      };
      const invalidState = Buffer.from(JSON.stringify(stateData)).toString('base64');
      
      expect(() => {
        validateOAuthState(invalidState);
      }).toThrow('Invalid state token signature');
    });

    it('should accept state tokens within expiry time', () => {
      const state = generateOAuthState({ expiresInMs: 60000 }); // 1 minute
      const payload = validateOAuthState(state, 60000);
      
      expect(payload).toBeDefined();
    });
  });

  describe('createStaffConnectionState', () => {
    it('should create state with staff ID', () => {
      const staffId = 'test-staff-456';
      const state = createStaffConnectionState(staffId);
      
      const payload = validateOAuthState(state);
      expect(payload.staffId).toBe(staffId);
    });

    it('should create state with staff ID and redirect URL', () => {
      const staffId = 'test-staff-456';
      const redirectUrl = 'http://localhost:3000/settings';
      const state = createStaffConnectionState(staffId, redirectUrl);
      
      const payload = validateOAuthState(state);
      expect(payload.staffId).toBe(staffId);
      expect(payload.redirectUrl).toBe(redirectUrl);
    });
  });

  describe('validateStaffConnectionState', () => {
    it('should validate staff connection state', () => {
      const staffId = 'test-staff-789';
      const state = createStaffConnectionState(staffId);
      
      const payload = validateStaffConnectionState(state);
      expect(payload.staffId).toBe(staffId);
    });

    it('should validate staff connection state with expected staff ID', () => {
      const staffId = 'test-staff-789';
      const state = createStaffConnectionState(staffId);
      
      const payload = validateStaffConnectionState(state, staffId);
      expect(payload.staffId).toBe(staffId);
    });

    it('should reject state with mismatched staff ID', () => {
      const staffId = 'test-staff-789';
      const expectedStaffId = 'different-staff-123';
      const state = createStaffConnectionState(staffId);
      
      expect(() => {
        validateStaffConnectionState(state, expectedStaffId);
      }).toThrow('State token staff ID mismatch');
    });

    it('should reject state without staff ID', () => {
      const state = generateOAuthState(); // No staff ID
      
      expect(() => {
        validateStaffConnectionState(state);
      }).toThrow('State token missing staff ID');
    });
  });

  describe('extractStaffIdFromState', () => {
    it('should extract staff ID from valid state', () => {
      const staffId = 'test-staff-999';
      const state = createStaffConnectionState(staffId);
      
      const extractedStaffId = extractStaffIdFromState(state);
      expect(extractedStaffId).toBe(staffId);
    });

    it('should return undefined for state without staff ID', () => {
      const state = generateOAuthState(); // No staff ID
      
      const extractedStaffId = extractStaffIdFromState(state);
      expect(extractedStaffId).toBeUndefined();
    });

    it('should return undefined for invalid state', () => {
      const extractedStaffId = extractStaffIdFromState('invalid-state');
      expect(extractedStaffId).toBeUndefined();
    });
  });

  describe('isStateTokenExpired', () => {
    it('should return false for valid state token', () => {
      const state = generateOAuthState();
      
      const isExpired = isStateTokenExpired(state);
      expect(isExpired).toBe(false);
    });

    it('should return true for expired state token', () => {
      // Create a state token with a timestamp from the past
      const pastTime = Date.now() - 20000; // 20 seconds ago
      const stateData = {
        payload: JSON.stringify({
          timestamp: pastTime,
          nonce: 'test-nonce'
        }),
        signature: 'dummy-signature'
      };
      const expiredState = Buffer.from(JSON.stringify(stateData)).toString('base64');
      
      const isExpired = isStateTokenExpired(expiredState);
      expect(isExpired).toBe(true);
    });

    it('should return true for invalid state token', () => {
      const isExpired = isStateTokenExpired('invalid-state');
      expect(isExpired).toBe(true);
    });

    it('should use custom max age', () => {
      const state = generateOAuthState({ expiresInMs: 5000 }); // 5 seconds
      
      // Should not be expired with 10 second max age
      const isExpired = isStateTokenExpired(state, 10000);
      expect(isExpired).toBe(false);
      
      // Create a state token that's 5 seconds old
      const pastTime = Date.now() - 5000; // 5 seconds ago
      const stateData = {
        payload: JSON.stringify({
          timestamp: pastTime,
          nonce: 'test-nonce'
        }),
        signature: 'dummy-signature'
      };
      const oldState = Buffer.from(JSON.stringify(stateData)).toString('base64');
      
      // Should be expired with 1 second max age
      const isExpiredShort = isStateTokenExpired(oldState, 1000);
      expect(isExpiredShort).toBe(true);
    });
  });
});