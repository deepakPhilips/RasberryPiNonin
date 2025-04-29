const bleno = require('@abandonware/bleno');
const BloodPressureService = require('./services/bloodPressureService');
const DeviceInfoService = require('./services/deviceInfoService');
const BatteryService = require('./services/batteryService');
const CustomService = require('./services/customService');

bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    bleno.startAdvertising('A&D_UA-651BLE_CCFEAF', ['1810']);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    bleno.setServices([
      new BloodPressureService(),
      new DeviceInfoService(),
      new BatteryService(),
      new CustomService()
    ]);
  }
});
