#!/bin/bash

# Base MAC prefix (locally administered)
MAC_PREFIX="02:00:00:00:04"

# Generate a random byte for the last segment (00–FF)
RAND_HEX=$(printf '%02X' $((RANDOM % 256)))

# Construct new MAC address
NEW_MAC="$MAC_PREFIX:$RAND_HEX"

echo "🔄 Setting new Bluetooth MAC address to: $NEW_MAC"

# Check for required tool
if ! command -v btmgmt &> /dev/null; then
  echo "❌ Error: 'btmgmt' not found. Please install bluez."
  exit 1
fi

# Restart Bluetooth stack with new address
sudo systemctl stop bluetooth
sudo hciconfig hci0 down
sudo btmgmt public-addr "$NEW_MAC"
sudo hciconfig hci0 up
sudo systemctl start bluetooth

echo "✅ MAC updated. Bluetooth restarted."
