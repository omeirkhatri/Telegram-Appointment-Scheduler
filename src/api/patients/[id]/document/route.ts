import { patientService } from '@/services/patientService';
import { storageService } from '@/services/storage';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/patients/[id]/document - Upload ID document for a patient
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if patient exists
    const patient = await patientService.getPatient(params.id);
    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found'
        },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided'
        },
        { status: 400 }
      );
    }

    // Validate file
    const validation = storageService.validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error
        },
        { status: 400 }
      );
    }

    // Upload file
    const uploadResult = await storageService.uploadPatientDocument(params.id, file);

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: uploadResult.error
        },
        { status: 500 }
      );
    }

    // Update patient with document URL
    await patientService.updatePatient(params.id, {
      id_document_url: uploadResult.filePath!,
      id_document_filename: file.name,
    });

    // Get signed URL for immediate access
    const documentUrl = await storageService.getDocumentUrl(uploadResult.filePath!);

    return NextResponse.json({
      success: true,
      data: {
        filePath: uploadResult.filePath,
        fileName: file.name,
        fileSize: storageService.formatFileSize(file.size),
        documentUrl
      },
      message: 'ID document uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/patients/[id]/document - Delete ID document for a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if patient exists
    const patient = await patientService.getPatient(params.id);
    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found'
        },
        { status: 404 }
      );
    }

    if (!patient.id_document_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'No ID document found for this patient'
        },
        { status: 404 }
      );
    }

    // Delete file from storage
    const deleteSuccess = await storageService.deletePatientDocument(patient.id_document_url);

    if (!deleteSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete document from storage'
        },
        { status: 500 }
      );
    }

    // Update patient to remove document references
    await patientService.updatePatient(params.id, {
      id_document_url: null,
      id_document_filename: null,
    });

    return NextResponse.json({
      success: true,
      message: 'ID document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete document'
      },
      { status: 500 }
    );
  }
}

// GET /api/patients/[id]/document - Get ID document URL for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if patient exists
    const patient = await patientService.getPatient(params.id);
    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found'
        },
        { status: 404 }
      );
    }

    if (!patient.id_document_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'No ID document found for this patient'
        },
        { status: 404 }
      );
    }

    // Get signed URL
    const documentUrl = await storageService.getDocumentUrl(patient.id_document_url);

    if (!documentUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate document URL'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        documentUrl,
        fileName: patient.id_document_filename,
        filePath: patient.id_document_url
      }
    });
  } catch (error) {
    console.error('Error getting document URL:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get document URL'
      },
      { status: 500 }
    );
  }
}
