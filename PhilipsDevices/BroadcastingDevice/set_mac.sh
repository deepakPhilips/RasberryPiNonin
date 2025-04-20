#!/bin/bash

# Base MAC prefix (locally administered)
MAC_PREFIX="02:00:00:00:02"
MAC_LOG_FILE="/var/tmp/mac_log.txt"

# Create log file if not present
touch "$MAC_LOG_FILE"

# Function to generate unique random byte
generate_unique_byte() {
  for i in {1..50}; do
    RAND_HEX=$(printf '%02X' $((RANDOM % 256)))
    if ! grep -q "${MAC_PREFIX}:${RAND_HEX}" "$MAC_LOG_FILE"; then
      echo "$RAND_HEX"
      return 0
    fi
  done
  echo "❌ Could not generate unique MAC byte after 50 attempts." >&2
  exit 1
}

# Generate and build MAC
LAST_BYTE=$(generate_unique_byte)
NEW_MAC="$MAC_PREFIX:$LAST_BYTE"

echo "🔄 Setting new Bluetooth MAC address: $NEW_MAC"

# Restart Bluetooth stack
sudo systemctl stop bluetooth
sudo hciconfig hci0 down
sudo btmgmt public-addr "$NEW_MAC"
sudo hciconfig hci0 up
sudo systemctl start bluetooth

# Log the new MAC
echo "$NEW_MAC" >> "$MAC_LOG_FILE"

echo "✅ MAC updated and logged at $MAC_LOG_FILE"
