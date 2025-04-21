import dbus
import dbus.service
from service import SERVICE_PATH

CHARACTERISTIC_UUID = "23434101-1FE4-1EFF-80CB-00FF78297D8B"
CHAR_PATH = "/org/bluez/example/service0/char0"

def encode_sfloat(value):
    mantissa = int(value * 100)
    exponent = -2 & 0x0F
    mantissa &= 0x0FFF
    sfloat = (exponent << 12) | mantissa
    return dbus.Array([sfloat & 0xFF, (sfloat >> 8) & 0xFF], signature='y')

class WeightCharacteristic(dbus.service.Object):
    def __init__(self, bus):
        dbus.service.Object.__init__(self, bus, CHAR_PATH)

    @dbus.service.method(dbus_interface="org.bluez.GattCharacteristic1", in_signature="", out_signature="ay")
    def ReadValue(self): return encode_sfloat(72.3)

    @dbus.service.method(dbus_interface="org.freedesktop.DBus.Properties", in_signature="ss", out_signature="v")
    def Get(self, interface, prop):
        if prop == "UUID":
            return dbus.String(CHARACTERISTIC_UUID)
        elif prop == "Service":
            return dbus.ObjectPath(SERVICE_PATH)
        elif prop == "Flags":
            return dbus.Array(["read", "notify"], signature="s")

    @dbus.service.method(dbus_interface="org.freedesktop.DBus.Properties", in_signature="s", out_signature="a{sv}")
    def GetAll(self, interface):
        return {
            "UUID": dbus.String(CHARACTERISTIC_UUID),
            "Service": dbus.ObjectPath(SERVICE_PATH),
            "Flags": dbus.Array(["read", "notify"], signature="s"),
        }