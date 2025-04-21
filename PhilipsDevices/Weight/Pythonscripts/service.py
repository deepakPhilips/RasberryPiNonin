
import dbus
import dbus.service

SERVICE_PATH = "/org/bluez/example/service0"
SERVICE_UUID = "23434100-1FE4-1EFF-80CB-00FF78297D8B"

class WeightService(dbus.service.Object):
    def __init__(self, bus):
        super().__init__(bus, SERVICE_PATH)

    @dbus.service.method(dbus_interface="org.freedesktop.DBus.Properties", in_signature="ss", out_signature="v")
    def Get(self, interface, prop):
        if prop == "UUID":
            return dbus.String(SERVICE_UUID)
        elif prop == "Primary":
            return dbus.Boolean(True)
        raise dbus.exceptions.DBusException("org.freedesktop.DBus.Error.InvalidArgs", "Unknown property")

    @dbus.service.method(dbus_interface="org.freedesktop.DBus.Properties", in_signature="s", out_signature="a{sv}")
    def GetAll(self, interface):
        return {
            "UUID": dbus.String(SERVICE_UUID),
            "Primary": dbus.Boolean(True)
        }

    @dbus.service.method(dbus_interface="org.freedesktop.DBus.Introspectable", in_signature="", out_signature="s")
    def Introspect(self):
        return """<node>
  <interface name="org.bluez.GattService1">
    <property name="UUID" type="s" access="read"/>
    <property name="Primary" type="b" access="read"/>
  </interface>
</node>"""
