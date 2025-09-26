'use client';

import { staffFormSchema, type StaffFormData } from '@/lib/validations/staff';
import type { Staff } from '@/types';
import type { CalendarErrorCode, CalendarVerificationStatus } from '@/types/calendar';
import { getCalendarErrorDescription, isRetryableError, requiresAdminIntervention } from '@/types/calendar';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, AlertTriangle, Calendar, CheckCircle, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface StaffFormProps {
  staff?: Staff;
  onSubmit: (data: StaffFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: (staffId: string) => Promise<void>;
  onFormChange?: () => void;
  onVerificationSuccess?: () => void;
  onCalendarRetry?: (staffId: string) => void;
  onCalendarVerify?: (staffId: string) => void;
  isLoading?: boolean;
  isRetryingCalendar?: boolean;
  isVerifyingCalendar?: boolean;
}

const STAFF_TYPES = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'physiotherapist', label: 'Physiotherapist' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'os_caregiver', label: 'OS Caregiver' },
  { value: 'driver', label: 'Driver' },
] as const;

export function StaffForm({
  staff,
  onSubmit,
  onCancel,
  onDelete,
  onFormChange,
  onVerificationSuccess,
  onCalendarRetry,
  onCalendarVerify,
  isLoading = false,
  isRetryingCalendar = false,
  isVerifyingCalendar = false
}: StaffFormProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEditingTelegramId, setIsEditingTelegramId] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    status: 'unverified' | 'verifying' | 'verified' | 'failed';
    message?: string;
  }>({
    status: staff?.telegram_verified ? 'verified' : 'unverified',
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      first_name: staff?.first_name || '',
      last_name: staff?.last_name || '',
      staff_type: staff?.staff_type || 'doctor',
      specialization: staff?.specialization || '',
      phone: staff?.phone || '',
      email: staff?.email || '',
      telegram_user_id: staff?.telegram_user_id || '',
      status: staff?.status || 'active',
      telegram_verified: staff?.telegram_verified ?? false,
    },
  });

  const telegramUserId = watch('telegram_user_id');
  const telegramVerified = watch('telegram_verified');

  // Handle changing Telegram ID
  const handleChangeTelegramId = () => {
    setIsEditingTelegramId(true);
    setVerificationStatus({
      status: 'unverified',
      message: 'Telegram ID changed. Please verify again.',
    });
    // Reset verification status when ID is changed
    reset({
      ...watch(),
      telegram_verified: false,
    });
  };

  // Handle canceling Telegram ID change
  const handleCancelTelegramIdChange = () => {
    setIsEditingTelegramId(false);
    // Reset to original values
    if (staff) {
      reset({
        ...watch(),
        telegram_user_id: staff.telegram_user_id || '',
        telegram_verified: staff.telegram_verified ?? false,
      });
      setVerificationStatus({
        status: staff.telegram_verified ? 'verified' : 'unverified',
      });
    }
  };

  // Reset form when staff changes
  useEffect(() => {
    if (staff) {
      reset({
        first_name: staff.first_name || '',
        last_name: staff.last_name || '',
        staff_type: staff.staff_type || 'doctor',
        specialization: staff.specialization || '',
        phone: staff.phone || '',
        email: staff.email || '',
        telegram_user_id: staff.telegram_user_id || '',
        status: staff.status || 'active',
        telegram_verified: staff.telegram_verified ?? false,
      });
      setVerificationStatus({
        status: staff.telegram_verified ? 'verified' : 'unverified',
      });
      setIsEditingTelegramId(false);
    }
  }, [staff, reset]);

  // Handle verification
  const handleVerify = async () => {
    if (!telegramUserId) {
      setVerificationStatus({
        status: 'failed',
        message: 'Telegram User ID is required for verification',
      });
      return;
    }

    // For new staff members (no ID yet), we can't verify until they're saved
    if (!staff?.id) {
      setVerificationStatus({
        status: 'failed',
        message: 'Please save the staff member first, then verify their Telegram account',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationStatus({ status: 'verifying' });

    try {
      const response = await fetch('/api/telegram/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: staff.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setVerificationStatus({
          status: 'verified',
          message: 'Verification message sent successfully!',
        });
        // Update the form's telegram_verified field
        reset({
          ...watch(),
          telegram_verified: true,
        });
        setIsEditingTelegramId(false);
        // Call the verification success callback to refresh data
        if (onVerificationSuccess) {
          onVerificationSuccess();
        }
      } else {
        setVerificationStatus({
          status: 'failed',
          message: result.error || 'Failed to send verification message',
        });
      }
    } catch (error) {
      setVerificationStatus({
        status: 'failed',
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFormSubmit = async (data: StaffFormData) => {
    try {
      // Ensure telegram_user_id is properly handled - convert empty strings to undefined
      const formData = {
        ...data,
        telegram_user_id: data.telegram_user_id && data.telegram_user_id.trim() !== ''
          ? data.telegram_user_id
          : (staff?.telegram_user_id && staff.telegram_user_id.trim() !== ''
              ? staff.telegram_user_id
              : undefined),
      };

      // Debug logging
      console.log('🔍 Form submission data:', {
        originalData: data,
        processedData: formData,
        staffTelegramId: staff?.telegram_user_id,
        isEditingTelegramId,
        telegramVerified
      });

      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleDelete = async () => {
    if (staff?.id && onDelete) {
      try {
        await onDelete(staff.id);
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  };

  // Calendar status helpers
  const getCalendarStatusIcon = (status: CalendarVerificationStatus | undefined) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'not_required':
        return <Calendar className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCalendarStatusText = (status: CalendarVerificationStatus | undefined) => {
    switch (status) {
      case 'verified':
        return 'Calendar Verified';
      case 'failed':
        return 'Calendar Setup Failed';
      case 'pending':
        return 'Calendar Pending';
      case 'not_required':
        return 'Calendar Not Required';
      default:
        return 'Calendar Status Unknown';
    }
  };

  const getCalendarStatusColor = (status: CalendarVerificationStatus | undefined) => {
    switch (status) {
      case 'verified':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'not_required':
        return 'bg-gray-50 border-gray-200 text-gray-600';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const handleCalendarRetry = () => {
    if (staff?.id && onCalendarRetry) {
      onCalendarRetry(staff.id);
    }
  };

  const handleCalendarVerify = () => {
    if (staff?.id && onCalendarVerify) {
      onCalendarVerify(staff.id);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            id="first_name"
            {...register('first_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter first name"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            id="last_name"
            {...register('last_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter last name"
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
          )}
        </div>

        {/* Staff Type */}
        <div>
          <label htmlFor="staff_type" className="block text-sm font-medium text-gray-700 mb-1">
            Staff Type *
          </label>
          <select
            id="staff_type"
            {...register('staff_type')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {STAFF_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.staff_type && (
            <p className="mt-1 text-sm text-red-600">{errors.staff_type.message}</p>
          )}
        </div>

        {/* Specialization */}
        <div>
          <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">
            Specialization
          </label>
          <input
            type="text"
            id="specialization"
            {...register('specialization')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter specialization"
          />
          {errors.specialization && (
            <p className="mt-1 text-sm text-red-600">{errors.specialization.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone *
          </label>
          <input
            type="tel"
            id="phone"
            {...register('phone')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter phone number"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
            {staff?.calendar_verification_status === 'verified' && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Verified
              </span>
            )}
            {staff?.calendar_verification_status === 'pending' && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Pending Verification
              </span>
            )}
          </label>
          <input
            type="email"
            id="email"
            {...register('email')}
            disabled={staff?.calendar_verification_status === 'verified'}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              staff?.calendar_verification_status === 'verified'
                ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                : 'border-gray-300'
            }`}
            placeholder="Enter email address (optional)"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
          {staff?.calendar_verification_status === 'verified' && (
            <p className="mt-1 text-sm text-green-600">
              ✓ Email is verified and cannot be changed. Use "Change Email" in manual controls if needed.
            </p>
          )}
          {staff?.calendar_verification_status === 'pending' && (
            <p className="mt-1 text-sm text-yellow-600">
              ⏳ Email verification is pending. You can change the email if needed.
            </p>
          )}
          {(!staff?.calendar_verification_status || staff?.calendar_verification_status === 'not_required' || staff?.calendar_verification_status === 'failed') && (
            <p className="mt-1 text-sm text-gray-500">
              Email is required for calendar integration. Staff will receive calendar invites at this address.
            </p>
          )}
        </div>

        {/* Telegram User ID */}
        <div>
          <label htmlFor="telegram_user_id" className="block text-sm font-medium text-gray-700 mb-1">
            Telegram User ID
          </label>
          <input
            type="text"
            id="telegram_user_id"
            {...register('telegram_user_id')}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              telegramVerified && !isEditingTelegramId ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            placeholder="Enter Telegram User ID"
            onKeyDown={(e) => {
              // Prevent editing when verified and not in edit mode
              if (telegramVerified && !isEditingTelegramId) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              // Prevent pasting when verified and not in edit mode
              if (telegramVerified && !isEditingTelegramId) {
                e.preventDefault();
              }
            }}
          />
          {errors.telegram_user_id && (
            <p className="mt-1 text-sm text-red-600">{errors.telegram_user_id.message}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Staff member needs to start a conversation with the bot to get their User ID
          </p>
        </div>

        {/* Telegram Verification */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telegram Verification
          </label>
          <div className="space-y-3">
            {/* Verified State */}
            {verificationStatus.status === 'verified' && (
              <div className="flex items-center justify-between">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">
                    Telegram account is verified and ready to receive notifications.
                  </p>
                </div>
                <div className="flex space-x-2 ml-3">
                  {isEditingTelegramId ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelTelegramIdChange}
                        className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleChangeTelegramId}
                      className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Change ID
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Unverified State */}
            {verificationStatus.status === 'unverified' && (
              <>
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Not Verified</span>
                </div>

                {/* Verification Instructions */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>To verify:</strong> Get the user ID from staff and ask them to send a message to <strong>BD_Appointment_Bot</strong> on Telegram.
                    {staff?.id ? ' Then click the Verify button below.' : ' After saving the staff member, you can verify their Telegram account by editing the staff member.'}
                  </p>
                </div>

                {/* Verify Button */}
                {telegramUserId && staff?.id && (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying || !telegramUserId}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Telegram'}
                  </button>
                )}

                {/* Note for new staff members */}
                {!staff?.id && telegramUserId && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Save the staff member first, then edit them to verify their Telegram account.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Failed State */}
            {verificationStatus.status === 'failed' && (
              <>
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Verification Failed</span>
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Verification failed:</strong> Make sure the staff member has sent a message to <strong>BD_Appointment_Bot</strong> on Telegram, then try again.
                  </p>
                </div>

                {/* Verify Button */}
                {telegramUserId && staff?.id && (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying || !telegramUserId}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Telegram'}
                  </button>
                )}
              </>
            )}

            {/* Verifying State */}
            {verificationStatus.status === 'verifying' && (
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 animate-pulse" />
                <span className="text-sm font-medium text-yellow-700">Verifying...</span>
              </div>
            )}

            {/* Verification Message */}
            {verificationStatus.message && verificationStatus.status !== 'verified' && (
              <p className={`text-sm ${
                verificationStatus.status === 'failed' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {verificationStatus.message}
              </p>
            )}
          </div>
        </div>

        {/* Calendar Status - Only show for existing staff with email */}
        {staff?.id && staff?.email && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calendar Status
            </label>
            <div className={`p-4 rounded-lg border ${getCalendarStatusColor(staff.calendar_verification_status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getCalendarStatusIcon(staff.calendar_verification_status)}
                  <div>
                    <h4 className="font-medium">{getCalendarStatusText(staff.calendar_verification_status)}</h4>
                    {staff.calendar_verification_date && staff.calendar_verification_status === 'verified' && (
                      <p className="text-sm opacity-75">
                        Verified {new Date(staff.calendar_verification_date).toLocaleDateString()}
                      </p>
                    )}
                    {staff.calendar_error_code && staff.calendar_verification_status === 'failed' && (
                      <p className="text-sm opacity-75">
                        Error: {getCalendarErrorDescription(staff.calendar_error_code as CalendarErrorCode)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {staff.calendar_verification_status === 'failed' &&
                   staff.calendar_error_code &&
                   isRetryableError(staff.calendar_error_code as CalendarErrorCode) && (
                    <button
                      type="button"
                      onClick={handleCalendarRetry}
                      disabled={isRetryingCalendar}
                      className="inline-flex items-center space-x-1 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRetryingCalendar ? 'animate-spin' : ''}`} />
                      <span>{isRetryingCalendar ? 'Retrying...' : 'Retry'}</span>
                    </button>
                  )}

                  {(staff.calendar_verification_status === 'pending' || staff.calendar_verification_status === 'failed') && (
                    <button
                      type="button"
                      onClick={handleCalendarVerify}
                      disabled={isVerifyingCalendar}
                      className="inline-flex items-center space-x-1 px-3 py-1 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{isVerifyingCalendar ? 'Verifying...' : 'Verify'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Error Details */}
              {staff.calendar_verification_status === 'failed' &&
               staff.calendar_error_code &&
               requiresAdminIntervention(staff.calendar_error_code as CalendarErrorCode) && (
                <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-red-800">Admin Intervention Required</p>
                      <p className="text-red-700 mt-1">
                        This error requires admin intervention to resolve. Please check the error details and contact support if needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            {...register('status')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        {/* Delete Button - Only show for existing staff */}
        {staff && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            disabled={isLoading || isSubmitting}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Staff</span>
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>

          {/* Calendar Verify Button - Only show for existing staff with email */}
          {staff?.id && staff?.email && staff.email.trim() !== '' &&
           (staff.calendar_verification_status === 'pending' || staff.calendar_verification_status === 'failed') && (
            <button
              type="button"
              onClick={handleCalendarVerify}
              disabled={isVerifyingCalendar || isLoading}
              className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifyingCalendar ? 'Verifying...' : 'Verify Calendar'}
            </button>
          )}

          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isSubmitting}
          >
            {isLoading || isSubmitting ? 'Saving...' : staff ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </form>
  );
}
