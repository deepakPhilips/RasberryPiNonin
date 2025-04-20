#!/usr/bin/env expect

set timeout -1

spawn bluetoothctl
expect "#"

send "agent on\r"
expect "#"

send "default-agent\r"
expect "#"

send "pairable on\r"
expect "#"

send "discoverable on\r"
expect "#"

send_user "✅ Auto-pairing agent running. Waiting for devices...\n"

# Loop: accept all incoming pairings and trust them
expect {
    "Confirm passkey" {
        send "yes\r"
        exp_continue
    }
    "Authorize service" {
        send "yes\r"
        exp_continue
    }
    "Request confirmation" {
        send "yes\r"
        exp_continue
    }
    "Request authorization" {
        send "yes\r"
        exp_continue
    }
}
