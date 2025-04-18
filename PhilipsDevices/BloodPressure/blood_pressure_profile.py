from gi.repository import GLib
import dbus
import dbus.exceptions
import dbus.mainloop.glib
import dbus.service
from pydbus import SystemBus

BLUEZ_SERVICE_NAME = 'org.bluez'
GATT_CHRC_IFACE = 'org.bluez.GattCharacteristic1'
GATT_SERVICE_IFACE = 'org.bluez.GattService1'

class BloodPressureMeasurementCharacteristic(dbus.service.Object):
    def __init__(self, bus, index, service):
        self.path = service.path + f'/char{index}'
        self.bus = bus
        self.uuid = '2A35'
        self.flags = ['notify']
        self.service = service
        self.notifying = False

        dbus.service.Object.__init__(self, bus, self.path)

    def get_properties(self):
        return {
            GATT_CHRC_IFACE: {
                'Service': self.service.path,
                'UUID': self.uuid,
                'Flags': self.flags,
                'Notifying': self.notifying
            }
        }

    def get_path(self):
        return dbus.ObjectPath(self.path)

    @dbus.service.method(GATT_CHRC_IFACE, in_signature='', out_signature='ay')
    def ReadValue(self):
        return self._encode_measurement()

    @dbus.service.method(GATT_CHRC_IFACE, in_signature='', out_signature='')
    def StartNotify(self):
        if self.notifying:
            return
        self.notifying = True
        print("Client subscribed for notifications")
        self.send_measurement()

    @dbus.service.method(GATT_CHRC_IFACE, in_signature='', out_signature='')
    def StopNotify(self):
        self.notifying = False
        print("Client unsubscribed from notifications")

    def send_measurement(self):
        if not self.notifying:
            return

        value = self._encode_measurement()
        self.PropertiesChanged(GATT_CHRC_IFACE, {'Value': value}, [])

    def _encode_measurement(self):
        return dbus.Array([0x00, 120, 80, 95, 72], signature='y')

    @dbus.service.signal(dbus_interface='org.freedesktop.DBus.Properties',
                         signature='sa{sv}as')
    def PropertiesChanged(self, interface, changed, invalidated):
        pass

class BloodPressureService(dbus.service.Object):
    PATH_BASE = '/org/bluez/example/service'

    def __init__(self, bus, index):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.uuid = '1810'
        self.primary = True
        self.characteristics = []

        dbus.service.Object.__init__(self, bus, self.path)
        self.characteristics.append(BloodPressureMeasurementCharacteristic(bus, 0, self))

    def get_properties(self):
        return {
            GATT_SERVICE_IFACE: {
                'UUID': self.uuid,
                'Primary': self.primary,
                'Characteristics': [c.get_path() for c in self.characteristics]
            }
        }

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def get_characteristics(self):
        return self.characteristics
