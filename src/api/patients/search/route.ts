import { patientService } from '@/services/patientService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/patients/search - Search patients with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const searchTerm = searchParams.get('q') || '';
    const area = searchParams.get('area') || '';
    const city = searchParams.get('city') || '';
    const hasIdDocument = searchParams.get('has_id_document');

    let patients;

    if (searchTerm) {
      // Use search functionality
      patients = await patientService.searchPatients(searchTerm);
    } else if (area) {
      // Filter by area
      patients = await patientService.getPatientsByArea(area);
    } else if (city) {
      // Filter by city
      patients = await patientService.getPatientsByCity(city);
    } else {
      // Use general filtering
      const filters: any = {};
      if (hasIdDocument !== null) {
        filters.has_id_document = hasIdDocument === 'true';
      }
      patients = await patientService.getPatients(filters);
    }

    return NextResponse.json({
      success: true,
      data: patients,
      count: patients.length
    });
  } catch (error) {
    console.error('Error searching patients:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search patients'
      },
      { status: 500 }
    );
  }
}
