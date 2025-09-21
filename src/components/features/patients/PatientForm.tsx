'use client';

import { patientFormSchema, type PatientFormData } from '@/lib/validations/patient';
import type { Patient } from '@/types';
import { extractCoordinatesFromGoogleMapsUrl, parseCoordinates } from '@/types/patient';
import { generateGoogleMapsQUrl } from '@/utils/coordinateHelpers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: PatientFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}


export function PatientForm({ patient, onSubmit, onCancel, isLoading = false }: PatientFormProps) {

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: patient?.name || '',
      phone: patient?.phone || '',
      flat_villa_no: patient?.flat_villa_no || '',
      building_street: patient?.building_street || '',
      area: patient?.area || '',
      city: patient?.city || '',
      google_maps_link: patient?.google_maps_link || '',
      coordinates: patient?.latitude && patient?.longitude
        ? `${patient.latitude}, ${patient.longitude}`
        : '',
      medical_notes: patient?.medical_notes || '',
      emergency_contact: patient?.emergency_contact || '',
      id_document_url: patient?.id_document_url || '',
    },
  });


  const handleFormSubmit = async (data: PatientFormData) => {
    try {
      // Parse coordinates if provided
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (data.coordinates?.trim()) {
        const parsed = parseCoordinates(data.coordinates);
        if (parsed) {
          latitude = parsed.latitude;
          longitude = parsed.longitude;
        }
      }

      // Convert form data to include parsed coordinates
      const formDataWithCoords = {
        ...data,
        latitude,
        longitude,
        // Remove the coordinates field as it's not part of the API
        coordinates: undefined,
      };

      await onSubmit(formDataWithCoords);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+971 50 123 4567"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="flat_villa_no" className="block text-sm font-medium text-gray-700 mb-1">
              Flat/Villa Number *
            </label>
            <input
              {...register('flat_villa_no')}
              type="text"
              id="flat_villa_no"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.flat_villa_no ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Villa 123"
            />
            {errors.flat_villa_no && (
              <p className="mt-1 text-sm text-red-600">{errors.flat_villa_no.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="building_street" className="block text-sm font-medium text-gray-700 mb-1">
              Building/Street *
            </label>
            <input
              {...register('building_street')}
              type="text"
              id="building_street"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.building_street ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Sheikh Zayed Road"
            />
            {errors.building_street && (
              <p className="mt-1 text-sm text-red-600">{errors.building_street.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
              Area *
            </label>
            <input
              {...register('area')}
              type="text"
              id="area"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.area ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Dubai Marina"
            />
            {errors.area && (
              <p className="mt-1 text-sm text-red-600">{errors.area.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              {...register('city')}
              type="text"
              id="city"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Dubai"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="google_maps_link" className="block text-sm font-medium text-gray-700 mb-1">
            Google Maps Link
          </label>
          <div className="flex gap-2">
            <input
              {...register('google_maps_link')}
              type="url"
              id="google_maps_link"
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.google_maps_link ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="https://maps.google.com/..."
            />
            <button
              type="button"
              onClick={() => {
                const coordinates = watch('coordinates');
                if (coordinates?.trim()) {
                  const parsed = parseCoordinates(coordinates);
                  if (parsed) {
                    const mapsUrl = generateGoogleMapsQUrl(parsed);
                    setValue('google_maps_link', mapsUrl);
                  } else {
                    alert('Invalid coordinates format. Please enter coordinates in the format: latitude, longitude');
                  }
                } else {
                  alert('Please enter coordinates first.');
                }
              }}
              className="px-3 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              title="Create Google Maps link from coordinates"
            >
              📍
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Enter coordinates below and click the location icon to create a Google Maps link
          </p>
          {errors.google_maps_link && (
            <p className="mt-1 text-sm text-red-600">{errors.google_maps_link.message}</p>
          )}
        </div>

        <div className="mt-4">
          <label htmlFor="coordinates" className="block text-sm font-medium text-gray-700 mb-1">
            Coordinates (Latitude, Longitude) *
          </label>
          <div className="flex gap-2">
            <input
              {...register('coordinates')}
              type="text"
              id="coordinates"
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.coordinates ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="25.157134, 55.409436"
              onChange={(e) => {
                // Real-time validation feedback
                const value = e.target.value.trim();
                if (value) {
                  const parsed = parseCoordinates(value);
                  if (parsed) {
                    e.target.classList.remove('border-red-500');
                    e.target.classList.add('border-green-500');
                  } else {
                    e.target.classList.remove('border-green-500');
                    e.target.classList.add('border-red-500');
                  }
                } else {
                  e.target.classList.remove('border-red-500', 'border-green-500');
                  e.target.classList.add('border-gray-300');
                }
              }}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Enter coordinates manually in the field below
          </p>
          {errors.coordinates && (
            <p className="mt-1 text-sm text-red-600">{errors.coordinates.message}</p>
          )}
        </div>
      </div>

      {/* Medical Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="medical_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Medical Notes
            </label>
            <textarea
              {...register('medical_notes')}
              id="medical_notes"
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.medical_notes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter any medical notes or special requirements..."
            />
            {errors.medical_notes && (
              <p className="mt-1 text-sm text-red-600">{errors.medical_notes.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact
            </label>
            <input
              {...register('emergency_contact')}
              type="text"
              id="emergency_contact"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.emergency_contact ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Emergency contact person and number"
            />
            {errors.emergency_contact && (
              <p className="mt-1 text-sm text-red-600">{errors.emergency_contact.message}</p>
            )}
          </div>
        </div>
      </div>


      {/* ID Document Link */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ID Document</h3>

        <div>
          <label htmlFor="id_document_url" className="block text-sm font-medium text-gray-700 mb-1">
            Google Drive Link
          </label>
          <input
            {...register('id_document_url')}
            type="url"
            id="id_document_url"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
              errors.id_document_url ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://drive.google.com/file/d/..."
          />
          <p className="mt-1 text-sm text-gray-500">
            Upload your ID document to Google Drive and paste the sharing link here
          </p>
          {errors.id_document_url && (
            <p className="mt-1 text-sm text-red-600">{errors.id_document_url.message}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? 'Saving...' : patient ? 'Update Patient' : 'Create Patient'}
        </button>
      </div>
    </form>
  );
}
