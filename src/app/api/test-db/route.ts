import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test basic Supabase connection
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: data,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      },
    }, { status: 500 });
  }
}
