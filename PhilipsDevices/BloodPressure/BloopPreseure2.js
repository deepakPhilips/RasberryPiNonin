const bleno = require('@abandonware/bleno');
const blenoPrimaryService = bleno.PrimaryService;
const blenoCharacteristic = bleno.Characteristic;
const blenoDescriptor = bleno.Descriptor;

// Define UUIDs for Blood Pressure service and characteristics
const bloodPressureServiceUUID = '1810';  // Blood Pressure Service
const bloodPressureMeasurementCharacteristicUUID = '2A35';  // Blood Pressure Measurement
const bloodPressureFeatureUUID = '2A49';  // Blood Pressure Feature

// Blood Pressure measurement data (Systolic, Diastolic, MAP, Pulse)
let systolic = 120;
let diastolic = 80;
let pulse = 72;
let map = 95; // Mean Arterial Pressure

// Blood Pressure Measurement Characteristic (Notify characteristic)
const bloodPressureMeasurementCharacteristic = new blenoCharacteristic({
  uuid: bloodPressureMeasurementCharacteristicUUID,
  properties: ['notify'],
  value: null,
  descriptors: [
    new blenoDescriptor({
      uuid: '2901',
      value: 'Blood Pressure Measurement'
    })
  ],
  onSubscribe: (maxValueSize, updateValueCallback) => {
    console.log('Client subscribed to Blood Pressure Measurement');
    setInterval(() => {
      // Send simulated blood pressure measurement data
      const data = Buffer.from([0x00, systolic, diastolic, map, pulse]);
      updateValueCallback(data);
      console.log('Sending blood pressure measurement');
    }, 2000); // Send data every 2 seconds
  },

  onUnsubscribe: () => {
    console.log('Client unsubscribed from Blood Pressure Measurement');
  }
});

// Blood Pressure Feature Characteristic
const bloodPressureFeatureCharacteristic = new blenoCharacteristic({
  uuid: bloodPressureFeatureUUID,
  properties: ['read'],
  value: Buffer.from([0x01])  // This indicates that Blood Pressure Measurement is supported
});

// Device Information Service
const deviceInformationServiceUUID = '180A';
const systemIdCharacteristicUUID = '2A23';  // System ID
const modelNumberCharacteristicUUID = '2A24';  // Model Number
const manufacturerNameCharacteristicUUID = '2A29';  // Manufacturer Name
const serialNumberCharacteristicUUID = '2A25';  // Serial Number

// Define the Device Information Service
const deviceInformationService = new blenoPrimaryService({
  uuid: deviceInformationServiceUUID,
  characteristics: [
    new blenoCharacteristic({
      uuid: manufacturerNameCharacteristicUUID,
      properties: ['read'],
      value: Buffer.from('A&D')  // Example manufacturer
    }),
    new blenoCharacteristic({
      uuid: modelNumberCharacteristicUUID,
      properties: ['read'],
      value: Buffer.from('UA-656BLE')  // Example model
    }),
    new blenoCharacteristic({
      uuid: systemIdCharacteristicUUID,
      properties: ['read'],
      value: Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])  // Example system ID
    }),
    new blenoCharacteristic({
      uuid: serialNumberCharacteristicUUID,
      properties: ['read'],
      value: Buffer.from('SN123456')  // Example serial number
    })
  ]
});

// Create and start the Blood Pressure Service
const bloodPressureService = new blenoPrimaryService({
  uuid: bloodPressureServiceUUID,
  characteristics: [
    bloodPressureMeasurementCharacteristic,
    bloodPressureFeatureCharacteristic
  ]
});

// Start advertising the BP Monitor peripheral
bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    console.log('Starting advertising...');
    bleno.startAdvertising('A&D_UA-656BLE1234', [bloodPressureServiceUUID, deviceInformationServiceUUID]);
  } else {
    bleno.stopAdvertising();
  }
});

// Set up GATT services after advertising starts
bleno.on('advertisingStart', (error) => {
  if (error) {
    console.error('Advertising failed to start:', error);
    return;
  }
  bleno.setServices([bloodPressureService, deviceInformationService]);
  console.log('Advertising started and services set');
});

// Start the Bleno event loop
bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    console.log('GATT server running');
  }
});
