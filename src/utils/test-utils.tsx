import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Mock theme provider for testing
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid='theme-provider'>{children}</div>;
};

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <MockThemeProvider>{children}</MockThemeProvider>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Re-export comprehensive mock factories from supabase-mocks
export {
  createMockPatient,
  createMockStaff,
  createMockAppointment,
  createMockAppointmentStaff,
  createMockPatients,
  createMockStaffMembers,
  createMockAppointments,
  createMockError,
  createMockNetworkError,
  createMockAuthError,
  mockSupabaseClient,
  setupMockPatients,
  setupMockStaff,
  setupMockAppointments,
  setupMockAppointmentStaff,
  clearAllMocks,
  resetMockSupabase,
  MockSupabaseQueryBuilderFactory,
} from './supabase-mocks';

// Legacy compatibility - keep these for existing tests
export const mockSupabaseResponse = {
  data: null,
  error: null,
};

export const mockSupabaseError = {
  data: null,
  error: {
    message: 'Test error message',
    code: 'TEST_ERROR',
  },
};

// Test environment helpers
export const setupTestEnvironment = () => {
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  });

  return {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
  };
};

// Async test helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Custom matchers for testing
export const expectElementToBeInDocument = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
};

export const expectElementNotToBeInDocument = (element: HTMLElement | null) => {
  expect(element).not.toBeInTheDocument();
};

// Form testing helpers
export const fillFormField = async (
  screen: any,
  label: string,
  value: string,
) => {
  const field = screen.getByLabelText(label);
  await field.clear();
  await field.type(value);
};

export const submitForm = async (screen: any, submitButtonText = 'Submit') => {
  const submitButton = screen.getByRole('button', { name: submitButtonText });
  await submitButton.click();
};
