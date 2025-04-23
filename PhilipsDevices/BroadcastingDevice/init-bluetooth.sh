#!/bin/bash
bluetoothctl << EOF
power on
pairable on
discoverable on
agent NoInputNoOutput
default-agent
EOF
