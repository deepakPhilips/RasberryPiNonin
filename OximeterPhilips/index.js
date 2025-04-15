const bleno = require('@abandonware/bleno');
const NoninService = require('./nonin-service');

const SERVICE_UUID = '46a970e00d5f11e28b5e0002a5d5c51b';

bleno.on('stateChange', (state) => {
  console.log(`Bluetooth state change: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising('Nonin3230', [SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('Advertising started.');
    bleno.setServices([
      new NoninService()
    ]);
  } else {
    console.error(`Advertising start error: ${error}`);
  }
});
