#!/bin/bash

echo "🌐 Starting Cloudflare Tunnel for MediCare Scheduler..."
echo "📝 Make sure you've:"
echo "   1. Added CNAME record in Cloudflare DNS"
echo "   2. Updated hostname in cloudflared-config.yml"
echo ""

# Check if config file exists
if [ ! -f "cloudflared-config.yml" ]; then
    echo "❌ Config file not found! Please create cloudflared-config.yml first"
    exit 1
fi

# Start the tunnel
echo "🚀 Starting tunnel..."
cloudflared tunnel --config cloudflared-config.yml run

echo "✅ Tunnel started! Your app should be available at:"
echo "   https://scheduler.bdocn8n.com"
echo ""
echo "🔗 Telegram webhook URL:"
echo "   https://scheduler.bdocn8n.com/api/telegram/webhook"
