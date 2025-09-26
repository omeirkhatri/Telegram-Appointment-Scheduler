import { appointmentCleanupDaemon } from '@/services/appointmentCleanupDaemon';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        const status = appointmentCleanupDaemon.getStatus();
        return NextResponse.json({ status });

      case 'stats':
        const stats = await appointmentCleanupDaemon.getCleanupStats();
        return NextResponse.json({ stats });

      default:
        return NextResponse.json({
          error: 'Invalid action. Use: status, stats'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in appointment cleanup daemon API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, appointmentId } = await request.json();

    switch (action) {
      case 'start':
        appointmentCleanupDaemon.start();
        return NextResponse.json({
          message: 'Appointment cleanup daemon started',
          status: appointmentCleanupDaemon.getStatus()
        });

      case 'stop':
        appointmentCleanupDaemon.stop();
        return NextResponse.json({
          message: 'Appointment cleanup daemon stopped',
          status: appointmentCleanupDaemon.getStatus()
        });

      case 'cleanup-specific':
        if (!appointmentId) {
          return NextResponse.json(
            { error: 'appointmentId is required for cleanup-specific action' },
            { status: 400 }
          );
        }

        await appointmentCleanupDaemon.cleanupSpecificAppointment(appointmentId);
        return NextResponse.json({
          message: `Appointment ${appointmentId} cleanup completed`
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Use: start, stop, cleanup-specific'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in appointment cleanup daemon API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

