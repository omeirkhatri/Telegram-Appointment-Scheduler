import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'

// Mock theme provider for testing
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="theme-provider">{children}</div>
}

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockThemeProvider>
      {children}
    </MockThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Test data factories
export const createMockPatient = (overrides = {}) => ({
  id: 'test-patient-id',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+971501234567',
  date_of_birth: '1990-01-01',
  address: '123 Healthcare Street, Dubai, UAE',
  emergency_contact: '+971509876543',
  medical_history: 'No known allergies',
  id_document_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockStaff = (overrides = {}) => ({
  id: 'test-staff-id',
  name: 'Dr. Jane Smith',
  email: 'jane.smith@example.com',
  phone: '+971501234568',
  staff_type: 'medical' as const,
  google_calendar_id: 'test-calendar-id',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockAppointment = (overrides = {}) => ({
  id: 'test-appointment-id',
  patient_id: 'test-patient-id',
  appointment_type: 'consultation' as const,
  start_time: '2024-01-01T10:00:00Z',
  end_time: '2024-01-01T11:00:00Z',
  status: 'scheduled' as const,
  notes: 'Regular checkup',
  custom_fields: {},
  recurring_rule: null,
  google_calendar_event_id: 'test-event-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// Mock Supabase responses
export const mockSupabaseResponse = {
  data: null,
  error: null,
}

export const mockSupabaseError = {
  data: null,
  error: {
    message: 'Test error message',
    code: 'TEST_ERROR',
  },
}

// Test environment helpers
export const setupTestEnvironment = () => {
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  })

  return {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
  }
}

// Async test helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Custom matchers for testing
export const expectElementToBeInDocument = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument()
}

export const expectElementNotToBeInDocument = (element: HTMLElement | null) => {
  expect(element).not.toBeInTheDocument()
}

// Form testing helpers
export const fillFormField = async (
  screen: any,
  label: string,
  value: string
) => {
  const field = screen.getByLabelText(label)
  await field.clear()
  await field.type(value)
}

export const submitForm = async (screen: any, submitButtonText = 'Submit') => {
  const submitButton = screen.getByRole('button', { name: submitButtonText })
  await submitButton.click()
}
