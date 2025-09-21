#!/bin/bash

echo "🔔 REMINDER MONITOR - Checking every 30 seconds"
echo "⏰ Current time: $(date)"
echo "📅 Appointment: 6:30 AM (2 minutes left!)"
echo ""

while true; do
    echo "=== $(date) ==="

    # Test the reminder system
    echo "🧪 Testing reminder system..."
    response=$(curl -s http://localhost:3000/api/test-30min-reminders)
    echo "Response: $response"

    # Check if we're in the reminder window
    echo "🔍 Checking reminder window..."
    node -e "
    const now = new Date();
    const dubaiTime = new Date(now.toLocaleString('en-US', {timeZone: 'Asia/Dubai'}));
    const appointmentTime = new Date('2025-09-19T06:30:00+04:00');
    const timeDiff = appointmentTime.getTime() - dubaiTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    console.log('Current Dubai time:', dubaiTime.toLocaleString('en-US', {timeZone: 'Asia/Dubai'}));
    console.log('Minutes until appointment:', Math.round(minutesDiff));
    console.log('In reminder window (25-35 min):', minutesDiff >= 25 && minutesDiff <= 35);
    "

    echo ""
    echo "⏳ Waiting 30 seconds..."
    echo "----------------------------------------"
    sleep 30
done
