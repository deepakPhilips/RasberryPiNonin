const bleno = require('@abandonware/bleno');
const BloodPressureService = require('./services/bloodPressureService');
const DeviceInfoService = require('./services/deviceInfoService');
const BatteryService = require('./services/batteryService');
const CustomService = require('./services/customService');
const { execSync, exec } = require('child_process');

bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    bleno.startAdvertising('A&D_UA-651BLE_CCFEAF', ['1810']);
  } else {
    bleno.stopAdvertising();
  }
});

try {
    console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
    execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to set MAC address:', error.message);
}

bleno.on('advertisingStart', (error) => {
  if (!error) {
    bleno.setServices([
      new BloodPressureService(),
      new DeviceInfoService(),
      new BatteryService(),
      new CustomService()
    ]);
  }
  console.log("🚀 ~ bleno.on ~ error:", error)

});
