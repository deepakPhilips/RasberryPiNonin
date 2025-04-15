#!/usr/bin/env python3

import dbus
import dbus.service
import dbus.mainloop.glib
import subprocess
from gi.repository import GLib
from pydbus import SystemBus

DEVICE_NAME = "A&D_UA-656BLE123"
SERVICE_UUID = "1810"     # Blood Pressure
CHAR_UUID = "2A35"        # Blood Pressure Measurement

# BlueZ agent path
AGENT_PATH = "/test/agent"

# -----------------------------
# BLE Advertisement + Agent
# -----------------------------

class NoInputNoOutputAgent(dbus.service.Object):
    def __init__(self, bus, path):
        super().__init__(bus, path)

    @dbus.service.method("org.bluez.Agent1", in_signature="", out_signature="")
    def Release(self):
        print("Agent released")

    @dbus.service.method("org.bluez.Agent1", in_signature="o", out_signature="")
    def RequestAuthorization(self, device):
        print(f"Authorizing device {device}")
        return

    @dbus.service.method("org.bluez.Agent1", in_signature="o", out_signature="")
    def AuthorizeService(self, device, uuid):
        print(f"AuthorizeService: {uuid}")
        return

    @dbus.service.method("org.bluez.Agent1", in_signature="o", out_signature="s")
    def RequestPinCode(self, device):
        return "0000"

    @dbus.service.method("org.bluez.Agent1", in_signature="o", out_signature="u")
    def RequestPasskey(self, device):
        return dbus.UInt32(123456)

    @dbus.service.method("org.bluez.Agent1", in_signature="o", out_signature="")
    def RequestConfirmation(self, device, passkey):
        print(f"Confirm passkey: {passkey}")
        return

    @dbus.service.method("org.bluez.Agent1", in_signature="o", out_signature="")
    def RequestPairingConsent(self, device):
        print("Pairing consent granted")
        return

    @dbus.service.method("org.bluez.Agent1", in_signature="", out_signature="")
    def Cancel(self):
        print("Cancelled")

# -----------------------------
# Main Setup
# -----------------------------

def register_agent():
    print("Registering pairing agent...")
    bus = dbus.SystemBus()
    manager = dbus.Interface(bus.get_object("org.bluez", "/org/bluez"),
                             "org.bluez.AgentManager1")
    agent = NoInputNoOutputAgent(bus, AGENT_PATH)
    manager.RegisterAgent(AGENT_PATH, "NoInputNoOutput")
    manager.RequestDefaultAgent(AGENT_PATH)
    print("Pairing agent registered (NoInputNoOutput)")

def set_device_name():
    print(f"Setting device name to {DEVICE_NAME}...")
    subprocess.run(["sudo", "hciconfig", "hci0", "name", DEVICE_NAME])

def start_advertising():
    print("Starting BLE advertising...")
    subprocess.run(["sudo", "bluetoothctl", "advertise", "yes"])
    subprocess.run(["sudo", "bluetoothctl", "discoverable", "on"])
    subprocess.run(["sudo", "bluetoothctl", "pairable", "on"])

def main():
    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    register_agent()
    set_device_name()
    start_advertising()
    print("BLE Peripheral ready. Waiting for connections...")

    loop = GLib.MainLoop()
    loop.run()

if __name__ == "__main__":
    main()
