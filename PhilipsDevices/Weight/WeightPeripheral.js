const bleno = require('@abandonware/bleno');
const deviceConfig = require('./WeightDeviceConfig.json');
const { createWeightCharacteristic } = require('./WeightCharacteristic');

bleno.on('stateChange', (state) => {
  console.log('Weight Scale BLE state:', state);
  if (state === 'poweredOn') {
    bleno.startAdvertising(deviceConfig.broadcastingName, [deviceConfig.broadcastingServiceID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (err) => {
  if (err) {
    console.error('❌ Advertising error:', err);
    return;
  }
  console.log(`📡 Advertising as ${deviceConfig.broadcastingName}`);

  bleno.setServices([
    new bleno.PrimaryService({
      uuid: deviceConfig.readingServiceID,
      characteristics: [
        createWeightCharacteristic(deviceConfig.characteristicID)
      ]
    })
  ]);
});
