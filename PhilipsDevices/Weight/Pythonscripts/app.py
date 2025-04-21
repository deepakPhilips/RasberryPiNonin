import dbus
import dbus.service
from dbus.mainloop.glib import DBusGMainLoop

DBusGMainLoop(set_as_default=True)

BUS_NAME = "org.bluez"
ADAPTER_PATH = "/org/bluez/hci0"
AGENT_PATH = "/org/bluez/example/agent"
DEVICE_NAME = "A&D_UC-352BLE_SIM"

class Agent(dbus.service.Object):
    @dbus.service.method(dbus_interface="org.bluez.Agent1", in_signature="o", out_signature="s")
    def RequestPinCode(self, device): return "0000"

    @dbus.service.method(dbus_interface="org.bluez.Agent1", in_signature="o", out_signature="u")
    def RequestPasskey(self, device): return dbus.UInt32(123456)

    @dbus.service.method(dbus_interface="org.bluez.Agent1", in_signature="ou", out_signature="")
    def RequestConfirmation(self, device, passkey): return

    @dbus.service.method(dbus_interface="org.bluez.Agent1", in_signature="os", out_signature="")
    def AuthorizeService(self, device, uuid): return

    @dbus.service.method(dbus_interface="org.bluez.Agent1", in_signature="", out_signature="")
    def Cancel(self): return

def setup_agent(bus):
    agent_mgr = dbus.Interface(bus.get_object(BUS_NAME, "/org/bluez"), "org.bluez.AgentManager1")
    Agent(bus, AGENT_PATH)
    agent_mgr.RegisterAgent(AGENT_PATH, "DisplayYesNo")
    agent_mgr.RequestDefaultAgent(AGENT_PATH)

    props = dbus.Interface(bus.get_object(BUS_NAME, ADAPTER_PATH), "org.freedesktop.DBus.Properties")
    props.Set("org.bluez.Adapter1", "Alias", dbus.String(DEVICE_NAME))
    props.Set("org.bluez.Adapter1", "Powered", dbus.Boolean(1))
    props.Set("org.bluez.Adapter1", "Discoverable", dbus.Boolean(1))
    props.Set("org.bluez.Adapter1", "Pairable", dbus.Boolean(1))