import dbus
from gi.repository import GLib
from app import setup_agent
from service import WeightService
from char import WeightCharacteristic
from adv import Advertisement

BUS_NAME = "org.bluez"
ADAPTER_PATH = "/org/bluez/hci0"
APP_PATH = "/org/bluez/example"

bus = dbus.SystemBus()

setup_agent(bus)
WeightService(bus)
WeightCharacteristic(bus)
Advertisement(bus)

gatt_mgr = dbus.Interface(bus.get_object(BUS_NAME, ADAPTER_PATH), "org.bluez.GattManager1")
adv_mgr = dbus.Interface(bus.get_object(BUS_NAME, ADAPTER_PATH), "org.bluez.LEAdvertisingManager1")

gatt_mgr.RegisterApplication(APP_PATH, {},
    reply_handler=lambda: print("✅ GATT registered"),
    error_handler=lambda e: print(f"❌ GATT error: {e}")
)

adv_mgr.RegisterAdvertisement("/org/bluez/example/advertisement0", {},
    reply_handler=lambda: print("✅ Advertisement registered"),
    error_handler=lambda e: print(f"❌ Advertisement error: {e}")
)

print("🚀 BLE Peripheral ready with pairing and weight service")
GLib.MainLoop().run()