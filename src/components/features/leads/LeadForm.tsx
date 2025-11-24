'use client';

import { leadFormSchema, type LeadFormData } from '@/lib/validations/lead';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface LeadFormProps {
  onSubmit: (data: LeadFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<LeadFormData>;
}

export function LeadForm({ onSubmit, onCancel, isLoading = false, initialData }: LeadFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      whatsapp_number: initialData?.whatsapp_number || '',
      has_whatsapp: initialData?.has_whatsapp ?? true,
      email: initialData?.email || '',
      service_interested_in: initialData?.service_interested_in || '',
      flat_villa_no: initialData?.flat_villa_no || '',
      building_street: initialData?.building_street || '',
      area: initialData?.area || '',
      city: initialData?.city || '',
      google_maps_link: initialData?.google_maps_link || '',
      stage: initialData?.stage || 'new',
      status: initialData?.status || 'active',
      assigned_to_user_id: initialData?.assigned_to_user_id || '',
    },
  });

  const hasWhatsApp = watch('has_whatsapp');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              {...register('phone')}
              type="tel"
              id="phone"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+971 50 123 4567"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="email@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="service_interested_in" className="block text-sm font-medium text-gray-700 mb-1">
              Service Interested In
            </label>
            <input
              {...register('service_interested_in')}
              type="text"
              id="service_interested_in"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Baby care, Physiotherapy"
            />
          </div>
        </div>

        {/* WhatsApp Information */}
        <div className="mt-4">
          <div className="flex items-center">
            <input
              {...register('has_whatsapp')}
              type="checkbox"
              id="has_whatsapp"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="has_whatsapp" className="ml-2 block text-sm text-gray-900">
              Phone number has WhatsApp
            </label>
          </div>

          {!hasWhatsApp && (
            <div className="mt-2">
              <label htmlFor="whatsapp_number" className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Number
              </label>
              <input
                {...register('whatsapp_number')}
                type="tel"
                id="whatsapp_number"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.whatsapp_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+971 50 123 4567"
              />
              {errors.whatsapp_number && (
                <p className="mt-1 text-sm text-red-600">{errors.whatsapp_number.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="flat_villa_no" className="block text-sm font-medium text-gray-700 mb-1">
              Flat/Villa Number
            </label>
            <input
              {...register('flat_villa_no')}
              type="text"
              id="flat_villa_no"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Villa 123"
            />
          </div>

          <div>
            <label htmlFor="building_street" className="block text-sm font-medium text-gray-700 mb-1">
              Building/Street
            </label>
            <input
              {...register('building_street')}
              type="text"
              id="building_street"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Building name or street"
            />
          </div>

          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <input
              {...register('area')}
              type="text"
              id="area"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Area name"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              {...register('city')}
              type="text"
              id="city"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Dubai"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="google_maps_link" className="block text-sm font-medium text-gray-700 mb-1">
            Google Maps Link
          </label>
          <input
            {...register('google_maps_link')}
            type="url"
            id="google_maps_link"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://maps.google.com/..."
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Lead'}
        </button>
      </div>
    </form>
  );
}



