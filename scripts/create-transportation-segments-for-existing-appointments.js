#!/usr/bin/env node

/**
 * Script to create transportation segments for existing appointments
 * This is needed for the rollout of the transportation segments feature
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function createTransportationSegmentsForExistingAppointments() {
  console.log('🚀 Creating transportation segments for existing appointments...\n');

  try {
    // 1. Get all appointments that have drivers assigned
    console.log('📋 Fetching appointments with drivers...');
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        duration_minutes,
        transportation_type,
        transportation_method,
        patient:patients(id, name, phone, flat_villa_no, building_street, area, city),
        staff_assignments:appointment_staff(
          staff:staff(id, first_name, last_name, staff_type, phone, email)
        )
      `)
      .eq('status', 'scheduled')
      .gte('appointment_date', new Date().toISOString().split('T')[0]); // Only future appointments

    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    console.log(`📊 Found ${appointments.length} appointments with drivers`);

    // 2. Filter appointments that have drivers
    const appointmentsWithDrivers = appointments.filter(appointment => {
      const drivers = appointment.staff_assignments?.filter(
        assignment => assignment.staff?.staff_type === 'driver'
      );
      return drivers && drivers.length > 0;
    });

    console.log(`🚗 Found ${appointmentsWithDrivers.length} appointments with drivers`);

    if (appointmentsWithDrivers.length === 0) {
      console.log('ℹ️  No appointments with drivers found. Creating sample segments...');
      await createSampleTransportationSegments();
      return;
    }

    // 3. Create transportation segments for each appointment
    let createdCount = 0;
    let errorCount = 0;

    for (const appointment of appointmentsWithDrivers) {
      try {
        console.log(`\n📅 Processing appointment ${appointment.id}...`);

        // Get the driver for this appointment
        const driver = appointment.staff_assignments.find(
          assignment => assignment.staff?.staff_type === 'driver'
        )?.staff;

        if (!driver) {
          console.log('⚠️  No driver found for appointment, skipping...');
          continue;
        }

        // Check if transportation segments already exist for this appointment
        const { data: existingSegments } = await supabase
          .from('transportation_segments')
          .select('id')
          .eq('appointment_id', appointment.id);

        if (existingSegments && existingSegments.length > 0) {
          console.log(`✅ Transportation segments already exist for appointment ${appointment.id}, skipping...`);
          continue;
        }

        // Calculate end time from start_time + duration_minutes
        const startTime = new Date(appointment.start_time);
        const endTime = new Date(startTime.getTime() + (appointment.duration_minutes || 60) * 60000);

        // Create pickup segment
        const pickupSegment = {
          appointment_id: appointment.id,
          segment_type: 'pickup',
          title: `Pickup ${appointment.patient.name}`,
          planned_start: new Date(startTime.getTime() - 30 * 60000).toISOString(), // 30 minutes before
          planned_end: startTime.toISOString(),
          driver_id: driver.id,
          travel_mode: 'driving',
          origin: {
            address: 'BestDoc Healthcare Center',
            coordinates: { lat: 25.2048, lng: 55.2708 } // Dubai coordinates
          },
          destination: {
            address: `${appointment.patient.flat_villa_no}, ${appointment.patient.building_street}, ${appointment.patient.area}, ${appointment.patient.city}`,
            coordinates: { lat: 25.2048, lng: 55.2708 } // Default coordinates
          },
          estimated_travel_minutes: 20,
          estimated_distance_km: 15.5,
          buffer_minutes: 10,
          instructions: `Pick up ${appointment.patient.name} for appointment`,
          requires_follow_up: false,
          status: 'scheduled',
          manual_override: false
        };

        // Create dropoff segment
        const dropoffSegment = {
          appointment_id: appointment.id,
          segment_type: 'dropoff',
          title: `Dropoff ${appointment.patient.name}`,
          planned_start: endTime.toISOString(),
          planned_end: new Date(endTime.getTime() + 30 * 60000).toISOString(), // 30 minutes after
          driver_id: driver.id,
          travel_mode: 'driving',
          origin: {
            address: `${appointment.patient.flat_villa_no}, ${appointment.patient.building_street}, ${appointment.patient.area}, ${appointment.patient.city}`,
            coordinates: { lat: 25.2048, lng: 55.2708 } // Default coordinates
          },
          destination: {
            address: 'BestDoc Healthcare Center',
            coordinates: { lat: 25.2048, lng: 55.2708 } // Dubai coordinates
          },
          estimated_travel_minutes: 20,
          estimated_distance_km: 15.5,
          buffer_minutes: 10,
          instructions: `Drop off ${appointment.patient.name} after appointment`,
          requires_follow_up: false,
          status: 'scheduled',
          manual_override: false
        };

        // Insert pickup segment
        const { error: pickupError } = await supabase
          .from('transportation_segments')
          .insert(pickupSegment);

        if (pickupError) {
          throw new Error(`Failed to create pickup segment: ${pickupError.message}`);
        }

        // Insert dropoff segment
        const { error: dropoffError } = await supabase
          .from('transportation_segments')
          .insert(dropoffSegment);

        if (dropoffError) {
          throw new Error(`Failed to create dropoff segment: ${dropoffError.message}`);
        }

        console.log(`✅ Created transportation segments for appointment ${appointment.id}`);
        createdCount += 2; // 2 segments per appointment

      } catch (error) {
        console.error(`❌ Error creating segments for appointment ${appointment.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Transportation segments creation completed!`);
    console.log(`✅ Created: ${createdCount} segments`);
    console.log(`❌ Errors: ${errorCount} appointments`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

async function createSampleTransportationSegments() {
  console.log('📝 Creating sample transportation segments...');

  try {
    // Get a sample appointment
    const { data: sampleAppointment } = await supabase
      .from('appointments')
      .select('id, start_time, duration_minutes')
      .eq('status', 'scheduled')
      .limit(1)
      .single();

    if (!sampleAppointment) {
      console.log('⚠️  No appointments found to create sample segments');
      return;
    }

    // Get a sample driver
    const { data: sampleDriver } = await supabase
      .from('staff')
      .select('id, first_name, last_name')
      .eq('staff_type', 'driver')
      .limit(1)
      .single();

    if (!sampleDriver) {
      console.log('⚠️  No drivers found to create sample segments');
      return;
    }

    // Calculate end time from start_time + duration_minutes
    const startTime = new Date(sampleAppointment.start_time);
    const endTime = new Date(startTime.getTime() + (sampleAppointment.duration_minutes || 60) * 60000);

    // Create sample segments
    const sampleSegments = [
      {
        appointment_id: sampleAppointment.id,
        segment_type: 'pickup',
        title: 'Sample Pickup Segment',
        planned_start: new Date(startTime.getTime() - 30 * 60000).toISOString(),
        planned_end: startTime.toISOString(),
        driver_id: sampleDriver.id,
        travel_mode: 'driving',
        origin: { address: 'BestDoc Healthcare Center', coordinates: { lat: 25.2048, lng: 55.2708 } },
        destination: { address: 'Sample Patient Address', coordinates: { lat: 25.2048, lng: 55.2708 } },
        estimated_travel_minutes: 20,
        estimated_distance_km: 15.5,
        buffer_minutes: 10,
        instructions: 'Sample pickup instructions',
        requires_follow_up: false,
        status: 'scheduled',
        manual_override: false
      },
      {
        appointment_id: sampleAppointment.id,
        segment_type: 'dropoff',
        title: 'Sample Dropoff Segment',
        planned_start: endTime.toISOString(),
        planned_end: new Date(endTime.getTime() + 30 * 60000).toISOString(),
        driver_id: sampleDriver.id,
        travel_mode: 'driving',
        origin: { address: 'Sample Patient Address', coordinates: { lat: 25.2048, lng: 55.2708 } },
        destination: { address: 'BestDoc Healthcare Center', coordinates: { lat: 25.2048, lng: 55.2708 } },
        estimated_travel_minutes: 20,
        estimated_distance_km: 15.5,
        buffer_minutes: 10,
        instructions: 'Sample dropoff instructions',
        requires_follow_up: false,
        status: 'scheduled',
        manual_override: false
      }
    ];

    for (const segment of sampleSegments) {
      const { error } = await supabase
        .from('transportation_segments')
        .insert(segment);

      if (error) {
        console.error(`❌ Error creating sample segment:`, error.message);
      } else {
        console.log(`✅ Created sample segment: ${segment.title}`);
      }
    }

  } catch (error) {
    console.error('❌ Error creating sample segments:', error.message);
  }
}

// Run the script
if (require.main === module) {
  createTransportationSegmentsForExistingAppointments()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createTransportationSegmentsForExistingAppointments };
