/**
 * API Error Handling Utility
 *
 * Provides centralized error handling and response formatting for API endpoints.
 * This ensures consistent error responses across all calendar-related endpoints.
 */

import { getErrorDescription, isRetryableError } from '@/lib/errorCodes';
import { CalendarErrorCode } from '@/types/calendar';
import { NextResponse } from 'next/server';

// =============================================================================
// ERROR RESPONSE INTERFACES
// =============================================================================

export interface ApiErrorResponse {
  success: false;
  error: string;
  error_code?: string;
  error_description?: string;
  suggested_actions?: string[];
  retryable?: boolean;
  details?: any;
  timestamp: string;
  request_id?: string;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp: string;
  };
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export enum ApiErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  CALENDAR_ERROR = 'CALENDAR_ERROR'
}

// =============================================================================
// ERROR HANDLER CLASS
// =============================================================================

export class ApiErrorHandler {
  private static instance: ApiErrorHandler;

  private constructor() {}

  public static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler();
    }
    return ApiErrorHandler.instance;
  }

  /**
   * Handle validation errors
   */
  public handleValidationError(
    errors: Array<{ field: string; message: string }>,
    requestId?: string
  ): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        error_code: ApiErrorType.VALIDATION_ERROR,
        error_description: 'One or more validation errors occurred',
        details: errors,
        timestamp: new Date().toISOString(),
        request_id: requestId
      },
      { status: 400 }
    );
  }

  /**
   * Handle authentication errors
   */
  public handleAuthenticationError(
    message: string = 'Authentication required',
    requestId?: string
  ): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: message,
        error_code: ApiErrorType.AUTHENTICATION_ERROR,
        error_description: 'Valid authentication credentials are required',
        suggested_actions: [
          'Check that you are logged in',
          'Verify your session is still valid',
          'Try logging in again'
        ],
        timestamp: new Date().toISOString(),
        request_id: requestId
      },
      { status: 401 }
    );
  }

  /**
   * Handle authorization errors
   */
  public handleAuthorizationError(
    message: string = 'Insufficient permissions',
    requestId?: string
  ): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: message,
        error_code: ApiErrorType.AUTHORIZATION_ERROR,
        error_description: 'You do not have permission to perform this action',
        suggested_actions: [
          'Check your user role and permissions',
          'Contact an administrator if you believe this is an error',
          'Verify you are accessing the correct resource'
        ],
        timestamp: new Date().toISOString(),
        request_id: requestId
      },
      { status: 403 }
    );
  }

  /**
   * Handle not found errors
   */
  public handleNotFoundError(
    resource: string,
    identifier?: string,
    requestId?: string
  ): NextResponse<ApiErrorResponse> {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    return NextResponse.json(
      {
        success: false,
        error: message,
        error_code: ApiErrorType.NOT_FOUND_ERROR,
        error_description: `The requested ${resource.toLowerCase()} could not be found`,
        suggested_actions: [
          'Verify the identifier is correct',
          'Check that the resource exists',
          'Refresh the data and try again'
        ],
        timestamp: new Date().toISOString(),
        request_id: requestId
      },
      { status: 404 }
    );
  }

  /**
   * Handle conflict errors
   */
  public handleConflictError(
    message: string,
    details?: any,
    requestId?: string
  ): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: message,
        error_code: ApiErrorType.CONFLICT_ERROR,
        error_description: 'The request conflicts with the current state of the resource',
        details,
        suggested_actions: [
          'Check the current state of the resource',
          'Resolve the conflict and try again',
          'Consider using a different approach'
        ],
        timestamp: new Date().toISOString(),
        request_id: requestId
      },
      { status: 409 }
    );
  }

  /**
   * Handle rate limit errors
   */
  public handleRateLimitError(
    retryAfter?: number,
    requestId?: string
  ): NextResponse<ApiErrorResponse> {
    const message = retryAfter
      ? `Rate limit exceeded. Try again in ${retryAfter} seconds`
      : 'Rate limit exceeded';

    return NextResponse.json(
      {
        success: false,
        error: message,
        error_code: ApiErrorType.RATE_LIMIT_ERROR,
        error_description: 'Too many requests have been made in a short period',
        suggested_actions: [
          'Wait before making another request',
          'Reduce the frequency of your requests',
          'Consider implementing request queuing'
        ],
        retryable: true,
        details: retryAfter ? { retry_after: retryAfter } : undefined,
        timestamp: new Date().toISOString(),
        request_id: requestId
      },
      { status: 429 }
    );
  }

  /**
   * Handle external service errors
   */
  public handleExternalServiceError(
    service: string,
    error: Error,
    requestId?: string
  ): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: `${service} service error`,
        error_code: ApiErrorType.EXTERNAL_SERVICE_ERROR,
        error_description: `An error occurred while communicating with ${service}`,
        details: {
          service,
          original_error: error.message
        },
        suggested_actions: [
          'Check if the external service is available',
          'Try the request again after a brief delay',
          'Contact support if the issue persists'
        ],
        retryable: true,
        timestamp: new Date().toISOString(),
        request_id: requestId
      },
      { status: 502 }
    );
  }

  /**
   * Handle calendar-specific errors
   */
  public handleCalendarError(
    errorCode: CalendarErrorCode,
    message?: string,
    details?: any,
    requestId?: string
  ): NextResponse<ApiErrorResponse> {
    const errorDescription = getErrorDescription(errorCode);
    const isRetryable = isRetryableError(errorCode);

    return NextResponse.json(
      {
        success: false,
        error: message || errorDescription?.title || 'Calendar operation failed',
        error_code: errorCode,
        error_description: errorDescription?.description,
        suggested_actions: errorDescription?.suggestedActions,
        retryable: isRetryable,
        details,
        timestamp: new Date().toISOString(),
        request_id: requestId
      },
      { status: getCalendarErrorStatus(errorCode) }
    );
  }

  /**
   * Handle internal server errors
   */
  public handleInternalError(
    error: Error,
    requestId?: string,
    includeDetails: boolean = false
  ): NextResponse<ApiErrorResponse> {
    console.error('❌ Internal server error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        error_code: ApiErrorType.INTERNAL_SERVER_ERROR,
        error_description: 'An unexpected error occurred while processing your request',
        details: includeDetails ? {
          message: error.message,
          stack: error.stack
        } : undefined,
        suggested_actions: [
          'Try the request again after a brief delay',
          'Check if the issue persists',
          'Contact support if the error continues'
        ],
        retryable: true,
        timestamp: new Date().toISOString(),
        request_id: requestId
      },
      { status: 500 }
    );
  }

  /**
   * Handle generic errors with automatic type detection
   */
  public handleError(
    error: Error | any,
    requestId?: string,
    context?: string
  ): NextResponse<ApiErrorResponse> {
    // Log the error with context
    if (context) {
      console.error(`❌ ${context}:`, error);
    } else {
      console.error('❌ API Error:', error);
    }

    // Handle known error types
    if (error instanceof ValidationError) {
      return this.handleValidationError(error.errors, requestId);
    }

    if (error instanceof AuthenticationError) {
      return this.handleAuthenticationError(error.message, requestId);
    }

    if (error instanceof AuthorizationError) {
      return this.handleAuthorizationError(error.message, requestId);
    }

    if (error instanceof NotFoundError) {
      return this.handleNotFoundError(error.resource, error.identifier, requestId);
    }

    if (error instanceof ConflictError) {
      return this.handleConflictError(error.message, error.details, requestId);
    }

    if (error instanceof RateLimitError) {
      return this.handleRateLimitError(error.retryAfter, requestId);
    }

    if (error instanceof ExternalServiceError) {
      return this.handleExternalServiceError(error.service, error.originalError, requestId);
    }

    if (error instanceof CalendarError) {
      return this.handleCalendarError(error.errorCode, error.message, error.details, requestId);
    }

    // Handle generic errors
    if (error instanceof Error) {
      return this.handleInternalError(error, requestId);
    }

    // Handle unknown error types
    return this.handleInternalError(
      new Error(typeof error === 'string' ? error : 'Unknown error'),
      requestId
    );
  }

  /**
   * Create a success response
   */
  public createSuccessResponse<T>(
    data: T,
    message?: string,
    meta?: Partial<ApiSuccessResponse<T>['meta']>
  ): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json({
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    });
  }
}

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

export class ValidationError extends Error {
  constructor(public errors: Array<{ field: string; message: string }>) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(public resource: string, public identifier?: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  constructor(public retryAfter?: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends Error {
  constructor(public service: string, public originalError: Error) {
    super(`${service} service error`);
    this.name = 'ExternalServiceError';
  }
}

export class CalendarError extends Error {
  constructor(
    public errorCode: CalendarErrorCode,
    message?: string,
    public details?: any
  ) {
    super(message || 'Calendar operation failed');
    this.name = 'CalendarError';
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get HTTP status code for calendar error
 */
function getCalendarErrorStatus(errorCode: CalendarErrorCode): number {
  switch (errorCode) {
    case 'CALENDAR_NOT_FOUND':
    case 'STAFF_EMAIL_MISSING':
      return 404;
    case 'PERMISSION_DENIED':
      return 403;
    case 'QUOTA_EXCEEDED':
    case 'GOOGLE_API_UNAVAILABLE':
      return 429;
    case 'EMAIL_INVALID':
    case 'INVITE_SEND_FAILED':
      return 400;
    default:
      return 500;
  }
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const apiErrorHandler = ApiErrorHandler.getInstance();
export default apiErrorHandler;
