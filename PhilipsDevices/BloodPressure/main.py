# main.py
from gi.repository import GLib
import dbus
import dbus.mainloop.glib
from pydbus import SystemBus
from blood_pressure_profile import BloodPressureService

BLUEZ_SERVICE_NAME = 'org.bluez'
ADAPTER_PATH = '/org/bluez/hci0'
GATT_MANAGER_IFACE = 'org.bluez.GattManager1'
AGENT_MANAGER_IFACE = 'org.bluez.AgentManager1'
AGENT_PATH = '/test/agent'

class NoInputNoOutputAgent(dbus.service.Object):
    AGENT_INTERFACE = "org.bluez.Agent1"

    def __init__(self, bus, path):
        dbus.service.Object.__init__(self, bus, path)

    @dbus.service.method(AGENT_INTERFACE, in_signature="", out_signature="")
    def Release(self):
        print("Agent Released")

    @dbus.service.method(AGENT_INTERFACE, in_signature="o", out_signature="")
    def RequestAuthorization(self, device):
        print(f"RequestAuthorization from {device}")

    @dbus.service.method(AGENT_INTERFACE, in_signature="os", out_signature="")
    def AuthorizeService(self, device, uuid):
        print(f"AuthorizeService {uuid} for {device}")

    @dbus.service.method(AGENT_INTERFACE, in_signature="", out_signature="")
    def Cancel(self):
        print("Agent Canceled")


def main():
    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus()

    adapter = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, ADAPTER_PATH), 'org.freedesktop.DBus.Properties')
    adapter.Set('org.bluez.Adapter1', 'Powered', dbus.Boolean(1))
    adapter.Set('org.bluez.Adapter1', 'Discoverable', dbus.Boolean(1))
    adapter.Set('org.bluez.Adapter1', 'Pairable', dbus.Boolean(1))
    adapter.Set('org.bluez.Adapter1', 'Alias', dbus.String('A&D_UA-656BLE1234'))

    # Register GATT application
    try:
        service = BloodPressureService(bus, 0)
        gatt_manager = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, ADAPTER_PATH), GATT_MANAGER_IFACE)
        gatt_manager.RegisterApplication(service.get_path(), {})
        print("✅ GATT application registered")
    except Exception as e:
        print("❌ Failed to register GATT app:", e)

    # Register the pairing agent
    try:
        agent = NoInputNoOutputAgent(bus, AGENT_PATH)
        agent_manager = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, "/org/bluez"), AGENT_MANAGER_IFACE)
        agent_manager.RegisterAgent(AGENT_PATH, "NoInputNoOutput")
        agent_manager.RequestDefaultAgent(AGENT_PATH)
        print("✅ Agent registered")
    except Exception as e:
        print("❌ Agent registration failed:", e)

    print("Peripheral running... Waiting for connections...")
    loop = GLib.MainLoop()
    loop.run()

if __name__ == '__main__':
    main()
