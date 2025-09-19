#!/bin/bash

echo "🔔 SENDING 30-MINUTE REMINDERS..."
echo "⏰ Time: $(date)"
echo ""

# Send reminders
response=$(curl -s -X POST http://localhost:3000/api/send-reminder-now)

# Parse and display results
echo "$response" | jq -r '
  if .success then
    "✅ " + .message
  else
    "❌ Error: " + .error
  end
'

echo ""

# Show appointments if any
echo "$response" | jq -r '
  if .appointments and (.appointments | length) > 0 then
    "📅 Appointments processed:",
    (.appointments[] | "   • " + .time + " - Patient " + .patient)
  else
    "ℹ️  No appointments in reminder window"
  end
'

echo ""

# Show detailed results if any
echo "$response" | jq -r '
  if .results and (.results | length) > 0 then
    "📊 Results:",
    (.results[] | "   • Appointment " + .appointmentId + ": " + (if .success then "✅" else "❌" end) + (if .notificationsSent then " (" + (.notificationsSent | tostring) + " sent)" else "" end) + (if .error then " - " + .error else "" end))
  else
    ""
  end
'
