const bleno = require('@abandonware/bleno');

const BLOOD_PRESSURE_SERVICE_UUID = '1810';
const BLOOD_PRESSURE_MEASUREMENT_UUID = '2A35';

const bloodPressureCharacteristic = new bleno.Characteristic({
  uuid: BLOOD_PRESSURE_MEASUREMENT_UUID,
  properties: ['notify'],
  value: null,
  onSubscribe: (maxValueSize, updateValueCallback) => {
    console.log('Central subscribed for BP notifications');
    
    // Send a fake BP reading every 5 seconds
    setInterval(() => {
      const systolic = 120;
      const diastolic = 80;
      const pulse = 70;

      // Example structure; actual spec-compliant encoding needed
      const buffer = Buffer.from([
        0x00,         // Flags
        systolic,     // Systolic (mock)
        diastolic,    // Diastolic (mock)
        pulse         // Pulse (mock)
      ]);
      updateValueCallback(buffer);
    }, 5000);
  }
});

const bpService = new bleno.PrimaryService({
  uuid: BLOOD_PRESSURE_SERVICE_UUID,
  characteristics: [bloodPressureCharacteristic]
});

bleno.on('stateChange', state => {
  if (state === 'poweredOn') {
    bleno.startAdvertising('MockBPDevice', [BLOOD_PRESSURE_SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', error => {
  if (!error) {
    bleno.setServices([bpService]);
    console.log('Started BP peripheral!');
  }
});
