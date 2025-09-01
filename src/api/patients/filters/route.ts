import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/services/patientService';

// GET /api/patients/filters - Get available filter options
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('type'); // 'areas' or 'cities'
    
    let data;
    
    if (filterType === 'areas') {
      data = await patientService.getAreas();
    } else if (filterType === 'cities') {
      data = await patientService.getCities();
    } else {
      // Return both areas and cities
      const [areas, cities] = await Promise.all([
        patientService.getAreas(),
        patientService.getCities()
      ]);
      
      data = {
        areas,
        cities
      };
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch filter options' 
      },
      { status: 500 }
    );
  }
}
