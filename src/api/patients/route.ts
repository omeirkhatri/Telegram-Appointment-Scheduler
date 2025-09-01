import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/services/patientService';
import { storageService } from '@/services/storage';
import type { CreatePatient, UpdatePatient, PatientFilters } from '@/types';

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
      data: patients 
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch patients' 
      },
      { status: 500 }
    );
  }
}

// POST /api/patients - Create a new patient
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract patient data
    const patientData: CreatePatient = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      flat_villa_no: formData.get('flat_villa_no') as string,
      building_street: formData.get('building_street') as string,
      area: formData.get('area') as string,
      city: formData.get('city') as string,
      google_maps_link: formData.get('google_maps_link') as string || undefined,
      medical_notes: formData.get('medical_notes') as string || undefined,
      emergency_contact: formData.get('emergency_contact') as string || undefined,
      preferred_transport: formData.get('preferred_transport') as string || undefined,
    };

    // Validate required fields
    const validationErrors = validatePatientData(patientData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: validationErrors 
        },
        { status: 400 }
      );
    }

    // Create patient first
    const patient = await patientService.createPatient(patientData);

    // Handle file upload if provided
    const idDocument = formData.get('id_document') as File | null;
    if (idDocument && idDocument.size > 0) {
      const uploadResult = await storageService.uploadPatientDocument(
        patient.id,
        idDocument
      );

      if (uploadResult.success && uploadResult.filePath) {
        // Update patient with document URL
        await patientService.updatePatient(patient.id, {
          id_document_url: uploadResult.filePath,
          id_document_filename: idDocument.name,
        });

        // Fetch updated patient
        const updatedPatient = await patientService.getPatient(patient.id);
        return NextResponse.json({ 
          success: true, 
          data: updatedPatient,
          message: 'Patient created successfully with ID document'
        });
      } else {
        // Patient created but file upload failed
        return NextResponse.json(
          { 
            success: true, 
            data: patient,
            warning: 'Patient created but ID document upload failed',
            uploadError: uploadResult.error
          },
          { status: 201 }
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: patient,
      message: 'Patient created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create patient' 
      },
      { status: 500 }
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
