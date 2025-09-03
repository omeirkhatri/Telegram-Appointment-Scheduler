import { patientService } from '@/services/patientService';
import { storageService } from '@/services/storage';
import type { UpdatePatient } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/patients/[id] - Get a single patient by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const patient = await patientService.getPatient(params.id);

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found',
        },
        { status: 404 },
      );
    }

    // If patient has an ID document, get a signed URL for viewing
    if (patient.id_document_url) {
      const documentUrl = await storageService.getDocumentUrl(patient.id_document_url);
      if (documentUrl) {
        patient.id_document_url = documentUrl;
      }
    }

    return NextResponse.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch patient',
      },
      { status: 500 },
    );
  }
}

// PUT /api/patients/[id] - Update an existing patient
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const formData = await request.formData();

    // Extract patient data
    const updateData: Partial<UpdatePatient> = {
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

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdatePatient] === undefined) {
        delete updateData[key as keyof UpdatePatient];
      }
    });

    // Validate required fields if they are being updated
    const validationErrors = validatePatientUpdateData(updateData);
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

    // Handle file upload if provided
    const idDocument = formData.get('id_document') as File | null;
    if (idDocument && idDocument.size > 0) {
      // Get current patient to check if they have an existing document
      const currentPatient = await patientService.getPatient(params.id);
      if (!currentPatient) {
        return NextResponse.json(
          {
            success: false,
            error: 'Patient not found',
          },
          { status: 404 },
        );
      }

      let uploadResult;
      if (currentPatient.id_document_url) {
        // Update existing document
        uploadResult = await storageService.updatePatientDocument(
          params.id,
          currentPatient.id_document_url,
          idDocument,
        );
      } else {
        // Upload new document
        uploadResult = await storageService.uploadPatientDocument(
          params.id,
          idDocument,
        );
      }

      if (uploadResult.success && uploadResult.filePath) {
        updateData.id_document_url = uploadResult.filePath;
        updateData.id_document_filename = idDocument.name;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to upload ID document',
            uploadError: uploadResult.error,
          },
          { status: 500 },
        );
      }
    }

    // Update patient
    const updatedPatient = await patientService.updatePatient(params.id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedPatient,
      message: 'Patient updated successfully',
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update patient',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/patients/[id] - Delete a patient
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Get current patient to check for ID document
    const currentPatient = await patientService.getPatient(params.id);
    if (!currentPatient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found',
        },
        { status: 404 },
      );
    }

    // Delete ID document if it exists
    if (currentPatient.id_document_url) {
      await storageService.deletePatientDocument(currentPatient.id_document_url);
    }

    // Delete patient
    await patientService.deletePatient(params.id);

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete patient',
      },
      { status: 500 },
    );
  }
}

// Helper function to validate patient update data
function validatePatientUpdateData(data: Partial<UpdatePatient>): string[] {
  const errors: string[] = [];

  if (data.name !== undefined && !data.name?.trim()) {
    errors.push('Name cannot be empty');
  }

  if (data.phone !== undefined && !data.phone?.trim()) {
    errors.push('Phone number cannot be empty');
  }

  if (data.flat_villa_no !== undefined && !data.flat_villa_no?.trim()) {
    errors.push('Flat/Villa number cannot be empty');
  }

  if (data.building_street !== undefined && !data.building_street?.trim()) {
    errors.push('Building/Street cannot be empty');
  }

  if (data.area !== undefined && !data.area?.trim()) {
    errors.push('Area cannot be empty');
  }

  if (data.city !== undefined && !data.city?.trim()) {
    errors.push('City cannot be empty');
  }

  return errors;
}
