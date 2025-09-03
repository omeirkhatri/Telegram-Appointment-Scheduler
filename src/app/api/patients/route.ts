import { patientService } from '@/services/patientService';
import type { CreatePatient, PatientFilters } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/patients - Get all patients with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query parameters
    const filters: PatientFilters = {};

    if (searchParams.has('name')) {
      filters.name = searchParams.get('name')!;
    }

    if (searchParams.has('phone')) {
      filters.phone = searchParams.get('phone')!;
    }

    if (searchParams.has('area')) {
      filters.area = searchParams.get('area')!;
    }

    if (searchParams.has('city')) {
      filters.city = searchParams.get('city')!;
    }

    if (searchParams.has('has_id_document')) {
      filters.has_id_document = searchParams.get('has_id_document') === 'true';
    }

    const patients = await patientService.getPatients(filters);

    return NextResponse.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch patients',
      },
      { status: 500 },
    );
  }
}

// POST /api/patients - Create a new patient
export async function POST(request: NextRequest) {
  try {
    // Parse JSON data
    const patientData: CreatePatient = await request.json();

    // Validate required fields
    const validationErrors = validatePatientData(patientData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    // Create patient
    const patient = await patientService.createPatient(patientData);

    return NextResponse.json({
      success: true,
      data: patient,
      message: 'Patient created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create patient',
      },
      { status: 500 },
    );
  }
}

// Helper function to validate patient data
function validatePatientData(data: CreatePatient): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Name is required');
  }

  if (!data.phone?.trim()) {
    errors.push('Phone number is required');
  }

  if (!data.flat_villa_no?.trim()) {
    errors.push('Flat/Villa number is required');
  }

  if (!data.building_street?.trim()) {
    errors.push('Building/Street is required');
  }

  if (!data.area?.trim()) {
    errors.push('Area is required');
  }

  if (!data.city?.trim()) {
    errors.push('City is required');
  }

  return errors;
}
