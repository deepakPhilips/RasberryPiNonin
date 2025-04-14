const bleno = require('@abandonware/bleno');

const DEVICE_NAME = 'A&D_UA-656BLE123'; // Matches the regex: ^A(&)?D_UA-656BLE(_)?[0-9a-zA-Z]*
const SERVICE_UUID = '1810'; // Blood Pressure Service
const CHARACTERISTIC_UUID = '2A35'; // Blood Pressure Measurement

// Create a valid BP measurement packet (flags + systolic + diastolic + MAP)
function createBloodPressureMeasurement() {
  const buffer = Buffer.alloc(7);
  buffer.writeUInt8(0x00, 0);         // Flags (0x00 = no timestamp, units in mmHg)
  buffer.writeUInt16LE(122, 1);       // Systolic (e.g., 122 mmHg)
  buffer.writeUInt16LE(79, 3);        // Diastolic (e.g., 79 mmHg)
  buffer.writeUInt16LE(93, 5);        // Mean Arterial Pressure
  return buffer;
}

// Blood Pressure Measurement characteristic (Notify)
const bpMeasurement = new bleno.Characteristic({
  uuid: CHARACTERISTIC_UUID,
  properties: ['notify'],
  onSubscribe: (maxValueSize, updateValueCallback) => {
    console.log('Subscribed to BP notifications');
    // Simulate one reading after a short delay
    setTimeout(() => {
      const data = createBloodPressureMeasurement();
      console.log('Sending BP data:', data.toString('hex'));
      updateValueCallback(data);
    }, 3000); // simulate delay like a real device
  },
  onUnsubscribe: () => {
    console.log('Unsubscribed from BP characteristic');
  }
});

// BLE service definition
const bpService = new bleno.PrimaryService({
  uuid: SERVICE_UUID,
  characteristics: [bpMeasurement]
});

// Start advertising
bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    console.log('Bluetooth powered on, advertising A&D UA-656BLE');
    bleno.startAdvertising(DEVICE_NAME, [SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (err) => {
  if (!err) {
    console.log('Advertising started');
    bleno.setServices([bpService]);
  } else {
    console.error('Advertising error:', err);
  }
});
