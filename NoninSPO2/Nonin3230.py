#!/usr/bin/env python3

import dbus
import random
from advertisement import Advertisement
from service import Application, Service, Characteristic, Descriptor

GATT_CHRC_IFACE = "org.bluez.GattCharacteristic1"
NOTIFY_TIMEOUT = 5000  # 5 seconds

class Nonin3230Advertisement(Advertisement):
    def __init__(self, index):
        super().__init__(index, "peripheral")
        self.add_local_name("Nonin3230")
        self.include_tx_power = True

class PulseOximeterService(Service):
    SERVICE_UUID = "46A970E0-0D5F-11E2-8B5E-0002A5D5C51B"

    def __init__(self, index):
        super().__init__(index, self.SERVICE_UUID, True)
        self.add_characteristic(PulseOximeterCharacteristic(self))

class PulseOximeterCharacteristic(Characteristic):
    CHARACTERISTIC_UUID = "0AAD7EA0-0D60-11E2-8E3C-0002A5D5C51B"

    def __init__(self, service):
        super().__init__(
            self.CHARACTERISTIC_UUID,
            ["read", "notify"],
            service
        )
        self.add_descriptor(PulseOximeterDescriptor(self))
        self.notifying = False

    def simulate_reading(self):
        spo2 = random.randint(95, 100)
        pulse = random.randint(60, 100)
        result = f"{spo2}% SpO2, {pulse} BPM"
        return [dbus.Byte(c.encode()) for c in result]

    def ReadValue(self, options):
        return self.simulate_reading()

    def StartNotify(self):
        if self.notifying:
            return
        self.notifying = True
        self.send_notification()

    def send_notification(self):
        if not self.notifying:
            return False
        value = self.simulate_reading()
        self.PropertiesChanged(GATT_CHRC_IFACE, {"Value": value}, [])
        self.add_timeout(NOTIFY_TIMEOUT, self.send_notification)
        return True

    def StopNotify(self):
        self.notifying = False

class PulseOximeterDescriptor(Descriptor):
    DESCRIPTOR_UUID = "2901"
    DESCRIPTOR_VALUE = "SpO2 and Pulse Rate"

    def __init__(self, characteristic):
        super().__init__(self.DESCRIPTOR_UUID, ["read"], characteristic)

    def ReadValue(self, options):
        return [dbus.Byte(c.encode()) for c in self.DESCRIPTOR_VALUE]

# Main app
app = Application()
app.add_service(PulseOximeterService(0))
app.register()

adv = Nonin3230Advertisement(0)
adv.register()

try:
    app.run()
except KeyboardInterrupt:
    app.quit()
