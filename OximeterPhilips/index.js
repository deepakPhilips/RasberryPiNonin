const bleno = require('@abandonware/bleno');
const NoninService = require('./nonin-service');

const DEVICE_NAME = 'Nonin3230';
const SERVICE_UUID = '46A970E0-0D5F-11E2-8B5E-0002A5D5C51B';

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
