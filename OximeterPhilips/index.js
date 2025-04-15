const bleno = require('@abandonware/bleno');
const NoninService = require('./nonin-service');

const DEVICE_NAME = 'Nonin3230';
const SERVICE_UUID = '46a970e00d5f11e28b5e0002a5d5c51b';

bleno.on('stateChange', (state) => {
  console.log(`[BLE] State changed: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising(DEVICE_NAME, [SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log(`[BLE] Advertising started as "${DEVICE_NAME}"`);
    bleno.setServices([
      new NoninService()
    ]);
  } else {
    console.error(`[BLE] Advertising start error:`, error);
  }
});
