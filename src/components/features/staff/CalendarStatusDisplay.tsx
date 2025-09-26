'use client';

import type { Staff } from '@/types';
import type { CalendarErrorCode, CalendarVerificationStatus } from '@/types/calendar';
import { getCalendarErrorDescription, isRetryableError, requiresAdminIntervention } from '@/types/calendar';
import {
    AlertCircle,
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    ExternalLink,
    Mail,
    RefreshCw,
    Settings,
    XCircle
} from 'lucide-react';
import { useState } from 'react';

interface CalendarStatusDisplayProps {
  staff: Staff;
  onRetry?: (staffId: string) => void;
  onVerify?: (staffId: string) => void;
  onManualVerify?: (staffId: string, action: 'send_email_again' | 'mark_verified' | 'change_email', newEmail?: string) => Promise<void>;
  isRetrying?: boolean;
  isVerifying?: boolean;
}

export function CalendarStatusDisplay({
  staff,
  onRetry,
  onVerify,
  onManualVerify,
  isRetrying = false,
  isVerifying = false
}: CalendarStatusDisplayProps) {
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [showManualControls, setShowManualControls] = useState(false);
  const [isManualActionLoading, setIsManualActionLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showChangeEmailForm, setShowChangeEmailForm] = useState(false);

  const getStatusIcon = (status: CalendarVerificationStatus | undefined) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'not_required':
        // Check if staff has email - if they do, show clock (in progress) instead of calendar
        if (staff.email && staff.email !== 'no-email@bestdoc.com') {
          return <Clock className="w-5 h-5 text-yellow-600" />;
        }
        return <Calendar className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: CalendarVerificationStatus | undefined) => {
    switch (status) {
      case 'verified':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'not_required':
        // Check if staff has email - if they do, show yellow (in progress) instead of gray
        if (staff.email && staff.email !== 'no-email@bestdoc.com') {
          return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        }
        return 'bg-gray-50 border-gray-200 text-gray-600';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const getStatusText = (status: CalendarVerificationStatus | undefined) => {
    switch (status) {
      case 'verified':
        return 'Calendar Verified';
      case 'failed':
        return 'Calendar Setup Failed';
      case 'pending':
        return 'Calendar Pending Verification';
      case 'not_required':
        // Check if staff has email - if they do, show different text
        if (staff.email && staff.email !== 'no-email@bestdoc.com') {
          return 'Calendar Setup In Progress';
        }
        return 'Calendar Not Required';
      default:
        return 'Calendar Status Unknown';
    }
  };

  const getStatusDescription = (status: CalendarVerificationStatus | undefined, errorCode?: CalendarErrorCode) => {
    if (status === 'verified') {
      return 'Staff member has access to their calendar and can receive appointment notifications.';
    }

    if (status === 'failed' && errorCode) {
      const errorDescription = getCalendarErrorDescription(errorCode);
      return `Calendar setup failed: ${errorDescription}`;
    }

    if (status === 'pending') {
      return 'Calendar has been created and shared. Waiting for staff member to verify access.';
    }

    if (status === 'not_required') {
      // Check if staff has email - if they do, calendar should be required
      if (staff.email && staff.email !== 'no-email@bestdoc.com') {
        return 'Calendar setup is in progress. This may take a few moments to complete.';
      }
      return 'No email address provided. Calendar integration is not required for this staff member.';
    }

    return 'Calendar status is unknown. Please check the error details or contact support.';
  };

  const canRetry = (status: CalendarVerificationStatus | undefined, errorCode?: CalendarErrorCode) => {
    if (status === 'failed' && errorCode) {
      return isRetryableError(errorCode);
    }
    return false;
  };

  const needsAdminIntervention = (status: CalendarVerificationStatus | undefined, errorCode?: CalendarErrorCode) => {
    if (status === 'failed' && errorCode) {
      return requiresAdminIntervention(errorCode);
    }
    return false;
  };

  const canVerify = (status: CalendarVerificationStatus | undefined) => {
    return status === 'pending' || status === 'failed';
  };

  const handleRetry = () => {
    if (onRetry && staff.id) {
      onRetry(staff.id);
    }
  };

  const handleVerify = () => {
    if (onVerify && staff.id) {
      onVerify(staff.id);
    }
  };

  const handleManualAction = async (action: 'send_email_again' | 'mark_verified' | 'change_email') => {
    if (!onManualVerify || !staff.id) return;

    setIsManualActionLoading(true);
    try {
      if (action === 'change_email') {
        await onManualVerify(staff.id, action, newEmail);
        setShowChangeEmailForm(false);
        setNewEmail('');
      } else {
        await onManualVerify(staff.id, action);
      }
      setShowManualControls(false);
    } catch (error) {
      console.error('Manual verification action failed:', error);
    } finally {
      setIsManualActionLoading(false);
    }
  };

  const handleChangeEmailClick = () => {
    setNewEmail(staff.email || '');
    setShowChangeEmailForm(true);
  };

  const canShowManualControls = (status: CalendarVerificationStatus | undefined) => {
    // Show manual controls if staff has a valid email
    // Don't show if email is not set or is the default no-email
    return staff.email && staff.email !== 'no-email@bestdoc.com';
  };

  const canChangeEmail = (status: CalendarVerificationStatus | undefined) => {
    // Can change email if not verified (allow changes even when pending)
    return status !== 'verified';
  };

  const getChangeEmailReason = (status: CalendarVerificationStatus | undefined) => {
    if (status === 'verified') {
      return 'Email is verified and cannot be changed directly. Use manual controls to change email.';
    }
    if (status === 'pending') {
      return 'Email verification is pending. Cannot change email until verification is complete.';
    }
    return null;
  };

  const status = staff.calendar_verification_status;
  const errorCode = staff.calendar_error_code as CalendarErrorCode | undefined;
  const verificationDate = staff.calendar_verification_date;
  const calendarId = staff.google_calendar_id;

  return (
    <div className="space-y-4">
      {/* Calendar Status Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Calendar Status</span>
        </h3>
        {calendarId && (
          <a
            href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Calendar</span>
          </a>
        )}
      </div>

      {/* Status Card */}
      <div className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
        <div className="flex items-start space-x-3">
          {getStatusIcon(status)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{getStatusText(status)}</h4>
              {verificationDate && status === 'verified' && (
                <span className="text-sm opacity-75">
                  Verified {new Date(verificationDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm mt-1 opacity-90">
              {getStatusDescription(status, errorCode)}
            </p>

            {/* Error Details Toggle */}
            {status === 'failed' && errorCode && (
              <button
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="text-sm underline hover:no-underline mt-2"
              >
                {showErrorDetails ? 'Hide' : 'Show'} error details
              </button>
            )}
          </div>
        </div>

        {/* Error Details */}
        {showErrorDetails && status === 'failed' && errorCode && (
          <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Error Code: {errorCode}</p>
                <p className="text-red-700 mt-1">
                  {getCalendarErrorDescription(errorCode)}
                </p>
                {needsAdminIntervention(status, errorCode) && (
                  <p className="text-red-600 mt-2 font-medium">
                    ⚠️ This error requires admin intervention to resolve.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 mt-4">
          {canRetry(status, errorCode) && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Retry Setup'}</span>
            </button>
          )}

          {canVerify(status) && (
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'Start Verification'}</span>
            </button>
          )}

          {/* Manual Verification Controls */}
          {canShowManualControls(status) && (
            <button
              onClick={() => setShowManualControls(!showManualControls)}
              className="inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <Settings className="w-4 h-4" />
              <span>Manual Controls</span>
            </button>
          )}
        </div>

        {/* Manual Verification Controls Panel */}
        {showManualControls && canShowManualControls(status) && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h5 className="font-medium text-gray-800 mb-3">Manual Verification Options</h5>
            <div className="space-y-2">
              {/* Send Email Again */}
              <button
                onClick={() => handleManualAction('send_email_again')}
                disabled={isManualActionLoading}
                className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                <span>{isManualActionLoading ? 'Sending...' : 'Send Email Again'}</span>
              </button>

              {/* Mark as Verified */}
              <button
                onClick={() => handleManualAction('mark_verified')}
                disabled={isManualActionLoading}
                className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isManualActionLoading ? 'Updating...' : 'Mark as Verified'}</span>
              </button>

              {/* Change Email */}
              <button
                onClick={handleChangeEmailClick}
                disabled={isManualActionLoading || !canChangeEmail(status)}
                className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings className="w-4 h-4" />
                <span>Change Email</span>
              </button>
            </div>
          </div>
        )}

        {/* Change Email Form */}
        {showChangeEmailForm && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h5 className="font-medium text-gray-800 mb-3">Change Email Address</h5>
            <div className="space-y-3">
              <div>
                <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 mb-1">
                  New Email Address
                </label>
                <input
                  type="email"
                  id="new-email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new email address"
                />
                <p className="mt-1 text-sm text-gray-600">
                  ⚠️ Changing email will reset verification status. Staff will need to verify the new email address.
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleManualAction('change_email')}
                  disabled={isManualActionLoading || !newEmail.trim() || newEmail === staff.email}
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isManualActionLoading ? 'Updating...' : 'Update Email'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowChangeEmailForm(false);
                    setNewEmail('');
                  }}
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <span>Cancel</span>
                </button>
              </div>
              {newEmail === staff.email && (
                <p className="text-sm text-gray-600">
                  New email must be different from current email address.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
