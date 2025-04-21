import dbus
import dbus.service

SERVICE_UUID = "23434100-1FE4-1EFF-80CB-00FF78297D8B"
DEVICE_NAME = "A&D_UC-352BLE_SIM"
ADVERT_PATH = "/org/bluez/example/advertisement0"

class Advertisement(dbus.service.Object):
    def __init__(self, bus):
        dbus.service.Object.__init__(self, bus, ADVERT_PATH)

    @dbus.service.method(dbus_interface="org.freedesktop.DBus.Properties", in_signature="s", out_signature="a{sv}")
    def GetAll(self, interface):
        return {
            "Type": dbus.String("peripheral"),
            "ServiceUUIDs": dbus.Array([SERVICE_UUID], signature='s'),
            "LocalName": dbus.String(DEVICE_NAME),
            "IncludeTxPower": dbus.Boolean(True),
        }

    @dbus.service.method(dbus_interface="org.bluez.LEAdvertisement1", in_signature="", out_signature="")
    def Release(self):
        print("🔕 Advertisement released")