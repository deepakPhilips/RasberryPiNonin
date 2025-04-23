const bleno = require('@abandonware/bleno');
const BlenoPrimaryService = bleno.PrimaryService;
const BlenoCharacteristic = bleno.Characteristic;
const Descriptor = bleno.Descriptor;

const SERVICE_UUID = '23434100-1FE4-1EFF-80CB-00FF78297D8B';
const CHARACTERISTIC_UUID = '23434101-1FE4-1EFF-80CB-00FF78297D8B';

const WeightMeasurementCharacteristic = new BlenoCharacteristic({
  uuid: CHARACTERISTIC_UUID,
  properties: ['notify'],
  descriptors: [
    new Descriptor({
      uuid: '2901',
      value: 'Weight Measurement'
    })
  ],
  onSubscribe: function(maxValueSize, updateValueCallback) {
    console.log('Weight subscribed');
    const weightKg = 70.3; // update with desired weight
    const measurement = encodeWeightMeasurement(weightKg);
    console.log('Sending weight data:', measurement.toString('hex'));
    updateValueCallback(measurement);
  },
  onUnsubscribe: function() {
    console.log('Weight unsubscribed');
  }
});

function encodeWeightMeasurement(weightKg) {
  const flags = 0x03; // weight in kg, timestamp present
  const weight = Math.round(weightKg * 200); // 0.005 kg resolution → 1kg = 200 units
  const now = new Date();
  const buffer = Buffer.alloc(10);

  buffer.writeUInt8(flags, 0);                   // Flags
  buffer.writeUInt16LE(weight, 1);              // Weight (kg)
  buffer.writeUInt16LE(now.getFullYear(), 3);   // Year
  buffer.writeUInt8(now.getMonth() + 1, 5);     // Month
  buffer.writeUInt8(now.getDate(), 6);          // Day
  buffer.writeUInt8(now.getHours(), 7);         // Hour
  buffer.writeUInt8(now.getMinutes(), 8);       // Minute
  buffer.writeUInt8(now.getSeconds(), 9);       // Second

  return buffer;
}

const weightService = new BlenoPrimaryService({
  uuid: SERVICE_UUID,
  characteristics: [WeightMeasurementCharacteristic]
});

bleno.on('stateChange', state => {
  console.log(`BLE stateChange: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising('A&D_UC-352BLE_SIM', [SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', error => {
  if (!error) {
    console.log('Started advertising weight service');
    bleno.setServices([weightService]);
  } else {
    console.error('Advertising start error:', error);
  }
});
