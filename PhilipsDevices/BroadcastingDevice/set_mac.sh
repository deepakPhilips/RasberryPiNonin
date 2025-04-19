#!/bin/bash

# Path to store the current MAC address
MAC_FILE="/var/tmp/custom_mac.txt"

# Fixed MAC prefix
MAC_PREFIX="02:00:00:00:02"

# Default last byte (hex)
DEFAULT_SUFFIX="48"

# Load or initialize last byte
if [ -f "$MAC_FILE" ]; then
  LAST_BYTE=$(cat "$MAC_FILE")
else
  LAST_BYTE=$DEFAULT_SUFFIX
fi

# Increment and wrap around after FF
DEC_VAL=$((16#$LAST_BYTE))
DEC_VAL=$(( (DEC_VAL + 1) % 256 ))
NEXT_BYTE=$(printf "%02X" $DEC_VAL)

# Compose full MAC
NEW_MAC="$MAC_PREFIX:$NEXT_BYTE"

# Save updated last byte
echo "$NEXT_BYTE" > "$MAC_FILE"

echo "🔧 Setting MAC address to: $NEW_MAC"

# Run the Bluetooth MAC change steps
sudo systemctl stop bluetooth
sudo hciconfig hci0 down
sudo btmgmt public-addr "$NEW_MAC"
sudo hciconfig hci0 up
sudo systemctl start bluetooth

echo "✅ MAC updated to $NEW_MAC and Bluetooth restarted."
