#!/bin/bash

# Calendar Sync Worker Startup Script
# This script starts the calendar sync worker that runs every 5 minutes

echo "🔄 Starting Calendar Sync Worker..."
echo "📅 This will sync appointments to Google Calendar every 5 minutes"
echo "⏰ Started at: $(date)"

# Change to the project directory
cd "$(dirname "$0")"

# Function to run the sync worker
run_sync() {
    echo "🔄 Running calendar sync at $(date)"
    node src/scripts/calendar-sync-worker.js
    echo "✅ Sync completed at $(date)"
    echo "---"
}

# Run the sync immediately
run_sync

# Then run every 5 minutes
while true; do
    sleep 300  # 5 minutes = 300 seconds
    run_sync
done

