/**
 * Comprehensive Supabase Query Mocking Utilities
 *
 * Provides type-safe, consistent mocking for all Supabase query patterns
 * used throughout the MediCare Scheduler application.
 */

import type {
    Appointment,
    AppointmentStaff,
    Patient,
    Staff
} from '@/types';

// Mock response types
export interface MockSupabaseResponse<T> {
  data: T | null;
  error: any;
  count?: number;
}

export interface MockSupabaseQueryBuilder<T> {
  select: (columns?: string) => MockSupabaseQueryBuilder<T>;
  insert: (data: any) => MockSupabaseQueryBuilder<T>;
  update: (data: any) => MockSupabaseQueryBuilder<T>;
  delete: () => MockSupabaseQueryBuilder<T>;
  eq: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  neq: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  gt: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  gte: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  lt: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  lte: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  like: (column: string, pattern: string) => MockSupabaseQueryBuilder<T>;
  ilike: (column: string, pattern: string) => MockSupabaseQueryBuilder<T>;
  is: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  not: (column: string, operator: string, value: any) => MockSupabaseQueryBuilder<T>;
  in: (column: string, values: any[]) => MockSupabaseQueryBuilder<T>;
  contains: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  containedBy: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  rangeGt: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  rangeGte: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  rangeLt: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  rangeLte: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  rangeAdjacent: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  overlaps: (column: string, value: any) => MockSupabaseQueryBuilder<T>;
  textSearch: (column: string, query: string) => MockSupabaseQueryBuilder<T>;
  match: (query: Record<string, any>) => MockSupabaseQueryBuilder<T>;
  notMatch: (query: Record<string, any>) => MockSupabaseQueryBuilder<T>;
  or: (query: string) => MockSupabaseQueryBuilder<T>;
  filter: (column: string, operator: string, value: any) => MockSupabaseQueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => MockSupabaseQueryBuilder<T>;
  limit: (count: number) => MockSupabaseQueryBuilder<T>;
  range: (from: number, to: number) => MockSupabaseQueryBuilder<T>;
  single: () => Promise<MockSupabaseResponse<T>>;
  maybeSingle: () => Promise<MockSupabaseResponse<T>>;
  csv: () => Promise<string>;
  geojson: () => Promise<any>;
  explain: (options?: any) => Promise<any>;
  rollback: () => MockSupabaseQueryBuilder<T>;
  returns: (columns?: string) => MockSupabaseQueryBuilder<T>;
  abortSignal: (signal: AbortSignal) => MockSupabaseQueryBuilder<T>;
  then: (onfulfilled?: (value: MockSupabaseResponse<T[]>) => any, onrejected?: (reason: any) => any) => Promise<any>;
}

// Mock data factories
export const createMockPatient = (overrides: Partial<Patient> = {}): Patient => ({
  id: 'test-patient-id',
  name: 'John Doe',
  phone: '+971501234567',
  id_document_url: null,
  id_document_filename: null,
  flat_villa_no: '123',
  building_street: 'Healthcare Street',
  area: 'Downtown',
  city: 'Dubai',
  google_maps_link: 'https://maps.google.com/test',
  medical_notes: 'No known allergies',
  emergency_contact: '+971509876543',
  preferred_transport: 'driver',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockStaff = (overrides: Partial<Staff> = {}): Staff => ({
  id: 'test-staff-id',
  first_name: 'Jane',
  last_name: 'Smith',
  staff_type: 'doctor',
  specialization: 'General Medicine',
  phone: '+971501234568',
  email: 'jane.smith@example.com',
  google_calendar_id: 'test-calendar-id',
  available_days: [1, 2, 3, 4, 5], // Monday to Friday
  working_hours_start: '09:00',
  working_hours_end: '17:00',
  status: 'active',
  email_notifications_enabled: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'test-appointment-id',
  patient_id: 'test-patient-id',
  appointment_type: 'doctor_on_call',
  appointment_date: '2024-01-15',
  start_time: '10:00',
  duration_minutes: 60,
  status: 'scheduled',
  custom_fields: {
    chief_complaint: 'Regular checkup',
    primary_doctor: 'test-staff-id',
  },
  transportation_type: 'driver',
  transportation_method: 'Company Driver',
  driver_id: 'test-driver-id',
  notes: 'Regular checkup appointment',
  recurring_rule: null,
  google_event_ids: {
    'test-staff-id': 'test-event-id',
    'test-driver-id': 'test-driver-event-id',
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockAppointmentStaff = (overrides: Partial<AppointmentStaff> = {}): AppointmentStaff => ({
  id: 'test-appointment-staff-id',
  appointment_id: 'test-appointment-id',
  staff_id: 'test-staff-id',
  role: 'primary',
  is_primary: true,
  google_event_id: 'test-event-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock collections
export const createMockPatients = (count: number = 3): Patient[] =>
  Array.from({ length: count }, (_, i) =>
    createMockPatient({
      id: `patient-${i + 1}`,
      name: `Patient ${i + 1}`,
      phone: `+97150123456${i}`,
    })
  );

export const createMockStaffMembers = (count: number = 3): Staff[] =>
  Array.from({ length: count }, (_, i) =>
    createMockStaff({
      id: `staff-${i + 1}`,
      first_name: `Staff${i + 1}`,
      last_name: 'Member',
      email: `staff${i + 1}@example.com`,
    })
  );

export const createMockAppointments = (count: number = 3): Appointment[] =>
  Array.from({ length: count }, (_, i) =>
    createMockAppointment({
      id: `appointment-${i + 1}`,
      patient_id: `patient-${i + 1}`,
      appointment_date: `2024-01-${15 + i}`,
    })
  );

// Mock error responses
export const createMockError = (message: string = 'Test error', code: string = 'TEST_ERROR') => ({
  data: null,
  error: { message, code, details: null, hint: null },
});

export const createMockNetworkError = () => ({
  data: null,
  error: { message: 'Network error', code: 'NETWORK_ERROR', details: null, hint: null },
});

export const createMockAuthError = () => ({
  data: null,
  error: { message: 'Authentication failed', code: 'AUTH_ERROR', details: null, hint: null },
});

// Query builder mock factory
export class MockSupabaseQueryBuilderFactory<T> {
  private mockData: T[] = [];
  private mockError: any = null;
  private shouldThrow = false;
  private queryChain: string[] = [];
  private filters: Record<string, any> = {};
  private orderBy: { column: string; ascending: boolean }[] = [];
  private limitCount?: number;
  private rangeFrom?: number;
  private rangeTo?: number;

  constructor(mockData: T[] = [], mockError: any = null) {
    this.mockData = mockData;
    this.mockError = mockError;
  }

  // Set mock data for this query
  withData(data: T[]): this {
    this.mockData = data;
    return this;
  }

  // Set mock error for this query
  withError(error: any): this {
    this.mockError = error;
    this.shouldThrow = false; // Don't throw by default, return error response
    return this;
  }

  // Simulate network error
  withNetworkError(): this {
    this.mockError = createMockNetworkError().error;
    this.shouldThrow = true;
    return this;
  }

  // Simulate auth error
  withAuthError(): this {
    this.mockError = createMockAuthError().error;
    this.shouldThrow = true;
    return this;
  }

  // Create the query builder
  create(): MockSupabaseQueryBuilder<T> {
    const self = this;

    const queryBuilder: MockSupabaseQueryBuilder<T> = {
      select: (columns?: string) => {
        self.queryChain.push(`select(${columns || '*'})`);
        return queryBuilder;
      },

      insert: (data: any) => {
        self.queryChain.push(`insert(${JSON.stringify(data)})`);
        return queryBuilder;
      },

      update: (data: any) => {
        self.queryChain.push(`update(${JSON.stringify(data)})`);
        return queryBuilder;
      },

      delete: () => {
        self.queryChain.push('delete()');
        return queryBuilder;
      },

      eq: (column: string, value: any) => {
        self.queryChain.push(`eq(${column}, ${JSON.stringify(value)})`);
        self.filters[column] = value;
        return queryBuilder;
      },

      neq: (column: string, value: any) => {
        self.queryChain.push(`neq(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      gt: (column: string, value: any) => {
        self.queryChain.push(`gt(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      gte: (column: string, value: any) => {
        self.queryChain.push(`gte(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      lt: (column: string, value: any) => {
        self.queryChain.push(`lt(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      lte: (column: string, value: any) => {
        self.queryChain.push(`lte(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      like: (column: string, pattern: string) => {
        self.queryChain.push(`like(${column}, ${pattern})`);
        return queryBuilder;
      },

      ilike: (column: string, pattern: string) => {
        self.queryChain.push(`ilike(${column}, ${pattern})`);
        return queryBuilder;
      },

      is: (column: string, value: any) => {
        self.queryChain.push(`is(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      not: (column: string, operator: string, value: any) => {
        self.queryChain.push(`not(${column}, ${operator}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      in: (column: string, values: any[]) => {
        self.queryChain.push(`in(${column}, ${JSON.stringify(values)})`);
        return queryBuilder;
      },

      contains: (column: string, value: any) => {
        self.queryChain.push(`contains(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      containedBy: (column: string, value: any) => {
        self.queryChain.push(`containedBy(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      rangeGt: (column: string, value: any) => {
        self.queryChain.push(`rangeGt(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      rangeGte: (column: string, value: any) => {
        self.queryChain.push(`rangeGte(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      rangeLt: (column: string, value: any) => {
        self.queryChain.push(`rangeLt(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      rangeLte: (column: string, value: any) => {
        self.queryChain.push(`rangeLte(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      rangeAdjacent: (column: string, value: any) => {
        self.queryChain.push(`rangeAdjacent(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      overlaps: (column: string, value: any) => {
        self.queryChain.push(`overlaps(${column}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      textSearch: (column: string, query: string) => {
        self.queryChain.push(`textSearch(${column}, ${query})`);
        return queryBuilder;
      },

      match: (query: Record<string, any>) => {
        self.queryChain.push(`match(${JSON.stringify(query)})`);
        return queryBuilder;
      },

      notMatch: (query: Record<string, any>) => {
        self.queryChain.push(`notMatch(${JSON.stringify(query)})`);
        return queryBuilder;
      },

      or: (query: string) => {
        self.queryChain.push(`or(${query})`);
        return queryBuilder;
      },

      filter: (column: string, operator: string, value: any) => {
        self.queryChain.push(`filter(${column}, ${operator}, ${JSON.stringify(value)})`);
        return queryBuilder;
      },

      order: (column: string, options?: { ascending?: boolean }) => {
        self.queryChain.push(`order(${column}, ${JSON.stringify(options)})`);
        self.orderBy.push({ column, ascending: options?.ascending ?? true });
        return queryBuilder;
      },

      limit: (count: number) => {
        self.queryChain.push(`limit(${count})`);
        self.limitCount = count;
        return queryBuilder;
      },

      range: (from: number, to: number) => {
        self.queryChain.push(`range(${from}, ${to})`);
        self.rangeFrom = from;
        self.rangeTo = to;
        return queryBuilder;
      },

      single: () => {
        self.queryChain.push('single()');
        return self.executeSingle();
      },

      maybeSingle: () => {
        self.queryChain.push('maybeSingle()');
        return self.executeMaybeSingle();
      },

      csv: () => {
        self.queryChain.push('csv()');
        return Promise.resolve('id,name\n1,Test');
      },

      geojson: () => {
        self.queryChain.push('geojson()');
        return Promise.resolve({ type: 'FeatureCollection', features: [] });
      },

      explain: (options?: any) => {
        self.queryChain.push(`explain(${JSON.stringify(options)})`);
        return Promise.resolve({ plan: 'Mock query plan' });
      },

      rollback: () => {
        self.queryChain.push('rollback()');
        return queryBuilder;
      },

      returns: (columns?: string) => {
        self.queryChain.push(`returns(${columns || '*'})`);
        return queryBuilder;
      },

      abortSignal: (signal: AbortSignal) => {
        self.queryChain.push('abortSignal()');
        return queryBuilder;
      },

      then: (onfulfilled?: (value: MockSupabaseResponse<T[]>) => any, onrejected?: (reason: any) => any) => {
        return self.execute().then(onfulfilled, onrejected);
      },
    };

    return queryBuilder;
  }

  private async execute(): Promise<MockSupabaseResponse<T[]>> {
    if (this.shouldThrow && this.mockError) {
      throw new Error(this.mockError.message);
    }

    if (this.mockError) {
      return { data: null, error: this.mockError };
    }

    let result = [...this.mockData];

    // Apply filters (simplified)
    Object.entries(this.filters).forEach(([column, value]) => {
      result = result.filter((item: any) => item[column] === value);
    });

    // Apply ordering
    this.orderBy.forEach(({ column, ascending }) => {
      result.sort((a: any, b: any) => {
        const aVal = a[column];
        const bVal = b[column];
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
      });
    });

    // Apply range
    if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
      result = result.slice(this.rangeFrom, this.rangeTo + 1);
    }

    // Apply limit
    if (this.limitCount !== undefined) {
      result = result.slice(0, this.limitCount);
    }

    return {
      data: result,
      error: null,
      count: result.length,
    };
  }

  private async executeSingle(): Promise<MockSupabaseResponse<T>> {
    const result = await this.execute();

    if (result.error) {
      return result;
    }

    if (!result.data || result.data.length === 0) {
      return {
        data: null,
        error: { message: 'No rows found', code: 'PGRST116' },
      };
    }

    if (result.data.length > 1) {
      return {
        data: null,
        error: { message: 'Multiple rows found', code: 'PGRST116' },
      };
    }

    return {
      data: result.data[0],
      error: null,
    };
  }

  private async executeMaybeSingle(): Promise<MockSupabaseResponse<T>> {
    const result = await this.execute();

    if (result.error) {
      return result;
    }

    if (!result.data || result.data.length === 0) {
      return {
        data: null,
        error: null,
      };
    }

    if (result.data.length > 1) {
      return {
        data: null,
        error: { message: 'Multiple rows found', code: 'PGRST116' },
      };
    }

    return {
      data: result.data[0],
      error: null,
    };
  }
}

// Mock Supabase client factory
export class MockSupabaseClient {
  private tableMocks: Map<string, any[]> = new Map();
  private tableErrors: Map<string, any> = new Map();

  // Set mock data for a table
  setTableData(table: string, data: any[]): this {
    this.tableMocks.set(table, data);
    return this;
  }

  // Set error for a table
  setTableError(table: string, error: any): this {
    this.tableErrors.set(table, error);
    return this;
  }

  // Get the from() method that returns query builders
  from<T>(table: string): MockSupabaseQueryBuilder<T> {
    const tableData = this.tableMocks.get(table) || [];
    const tableError = this.tableErrors.get(table);

    const factory = new MockSupabaseQueryBuilderFactory<T>(tableData, tableError);
    return factory.create();
  }

  // Auth methods
  auth = {
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  };

  // Storage methods
  storage = {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
      download: jest.fn(() => Promise.resolve({ data: null, error: null })),
      remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/file' } })),
    })),
  };
}

// Global mock client instance
export const mockSupabaseClient = new MockSupabaseClient();

// Helper functions for common test scenarios
export const setupMockPatients = (count: number = 3) => {
  const patients = createMockPatients(count);
  mockSupabaseClient.setTableData('patients', patients);
  return patients;
};

export const setupMockStaff = (count: number = 3) => {
  const staff = createMockStaffMembers(count);
  mockSupabaseClient.setTableData('staff', staff);
  return staff;
};

export const setupMockAppointments = (count: number = 3) => {
  const appointments = createMockAppointments(count);
  mockSupabaseClient.setTableData('appointments', appointments);
  return appointments;
};

export const setupMockAppointmentStaff = (count: number = 3) => {
  const appointmentStaff = Array.from({ length: count }, (_, i) =>
    createMockAppointmentStaff({
      id: `appointment-staff-${i + 1}`,
      appointment_id: `appointment-${i + 1}`,
      staff_id: `staff-${i + 1}`,
    })
  );
  mockSupabaseClient.setTableData('appointment_staff', appointmentStaff);
  return appointmentStaff;
};

// Clear all mocks
export const clearAllMocks = () => {
  mockSupabaseClient.tableMocks.clear();
  mockSupabaseClient.tableErrors.clear();
  jest.clearAllMocks();
};

// Reset to default state
export const resetMockSupabase = () => {
  clearAllMocks();
  setupMockPatients();
  setupMockStaff();
  setupMockAppointments();
  setupMockAppointmentStaff();
};
