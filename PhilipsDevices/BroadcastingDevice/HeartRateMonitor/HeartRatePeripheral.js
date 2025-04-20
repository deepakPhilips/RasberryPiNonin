const bleno = require('@abandonware/bleno');
const deviceConfig = require('./HeartRateDeviceConfig.json');
const { createHeartRateCharacteristic } = require('./HeartRateCharacteristic');
const { execSync } = require('child_process');

// Set MAC address before advertising
try {
  console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
  execSync('bash ../set_mac.sh', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to set MAC address:', error.message);
}

bleno.on('stateChange', (state) => {
  console.log('💓 HRM BLE State:', state);
  if (state === 'poweredOn') {
    bleno.startAdvertising(deviceConfig.broadcastingName, [deviceConfig.broadcastingServiceID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (err) => {
  if (err) return console.error('❌ Advertising failed:', err);
  console.log(`📡 Advertising as ${deviceConfig.broadcastingName}`);

  bleno.setServices([
    new bleno.PrimaryService({
      uuid: deviceConfig.readingServiceID,
      characteristics: [
        createHeartRateCharacteristic(deviceConfig.characteristicID)
      ]
    })
  ]);
});
