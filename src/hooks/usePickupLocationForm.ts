import type { Appointment } from '@/types';
import type { PickupLocationType, TransportationSegmentLocation } from '@/types/transportationSegment';
import type { PickupLocationValidationResult } from '@/utils/pickupLocationValidation';
import {
    getPickupLocationValidationSummary,
    validatePickupLocationBusinessRules,
    validatePickupLocationData
} from '@/utils/pickupLocationValidation';
import { useCallback, useEffect, useState } from 'react';

export interface UsePickupLocationFormOptions {
  initialType?: PickupLocationType;
  initialLocation?: TransportationSegmentLocation | null;
  initialReference?: string | null;
  appointments?: Appointment[];
  onValidationChange?: (validation: PickupLocationValidationResult) => void;
}

export interface UsePickupLocationFormReturn {
  // State
  pickupLocationType: PickupLocationType;
  pickupLocation: TransportationSegmentLocation | null;
  pickupLocationReference: string | null;
  validation: PickupLocationValidationResult;

  // Actions
  setPickupLocationType: (type: PickupLocationType) => void;
  setPickupLocation: (location: TransportationSegmentLocation | null) => void;
  setPickupLocationReference: (reference: string | null) => void;
  resetForm: () => void;

  // Computed
  isFormValid: boolean;
  hasWarnings: boolean;
  hasErrors: boolean;
  validationSummary: {
    status: 'valid' | 'warning' | 'error';
    message: string;
    details: string[];
  };
}

export function usePickupLocationForm({
  initialType = 'office',
  initialLocation = null,
  initialReference = null,
  appointments = [],
  onValidationChange,
}: UsePickupLocationFormOptions = {}): UsePickupLocationFormReturn {

  // Form state
  const [pickupLocationType, setPickupLocationTypeState] = useState<PickupLocationType>(initialType);
  const [pickupLocation, setPickupLocationState] = useState<TransportationSegmentLocation | null>(initialLocation);
  const [pickupLocationReference, setPickupLocationReferenceState] = useState<string | null>(initialReference);

  // Validation state
  const [validation, setValidation] = useState<PickupLocationValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  });

  // Validate form data whenever it changes
  useEffect(() => {
    const basicValidation = validatePickupLocationData(
      pickupLocationType,
      pickupLocation,
      pickupLocationReference,
      appointments
    );

    const businessValidation = validatePickupLocationBusinessRules(
      pickupLocationType,
      pickupLocation,
      pickupLocationReference,
      appointments
    );

    const combinedValidation: PickupLocationValidationResult = {
      isValid: basicValidation.isValid && businessValidation.isValid,
      errors: [...basicValidation.errors, ...businessValidation.errors],
      warnings: [...basicValidation.warnings, ...businessValidation.warnings],
    };

    setValidation(combinedValidation);

    if (onValidationChange) {
      onValidationChange(combinedValidation);
    }
  }, [pickupLocationType, pickupLocation, pickupLocationReference, appointments, onValidationChange]);

  // Action handlers
  const setPickupLocationType = useCallback((type: PickupLocationType) => {
    setPickupLocationTypeState(type);

    // Clear location and reference when type changes
    setPickupLocationState(null);
    setPickupLocationReferenceState(null);
  }, []);

  const setPickupLocation = useCallback((location: TransportationSegmentLocation | null) => {
    setPickupLocationState(location);
  }, []);

  const setPickupLocationReference = useCallback((reference: string | null) => {
    setPickupLocationReferenceState(reference);
  }, []);

  const resetForm = useCallback(() => {
    setPickupLocationTypeState(initialType);
    setPickupLocationState(initialLocation);
    setPickupLocationReferenceState(initialReference);
  }, [initialType, initialLocation, initialReference]);

  // Computed values
  const isFormValid = validation.isValid;
  const hasWarnings = validation.warnings.length > 0;
  const hasErrors = validation.errors.length > 0;
  const validationSummary = getPickupLocationValidationSummary(validation);

  return {
    // State
    pickupLocationType,
    pickupLocation,
    pickupLocationReference,
    validation,

    // Actions
    setPickupLocationType,
    setPickupLocation,
    setPickupLocationReference,
    resetForm,

    // Computed
    isFormValid,
    hasWarnings,
    hasErrors,
    validationSummary,
  };
}
