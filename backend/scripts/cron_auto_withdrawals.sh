#!/bin/bash
# SDM REWARDS - Auto Withdrawal Cron Script
# ==========================================
# This script should be called by cron every hour to process scheduled withdrawals.
#
# Crontab entry (add via: crontab -e):
#   0 * * * * /path/to/cron_auto_withdrawals.sh >> /var/log/sdm_auto_withdrawals.log 2>&1
#
# For production with systemd timer:
#   See /app/backend/scripts/auto-withdrawal.service and auto-withdrawal.timer

API_URL="${SDM_API_URL:-https://sdmrewards.com/api}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting auto-withdrawal cron job..."

# Call the auto-withdrawal endpoint
response=$(curl -s -X POST "${API_URL}/tasks/process-auto-withdrawals" \
    -H "Content-Type: application/json" \
    --max-time 60)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Response: $response"

# Check if successful
if echo "$response" | grep -q '"success": true'; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Auto-withdrawals processed successfully"
    exit 0
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Auto-withdrawal processing failed"
    exit 1
fi
