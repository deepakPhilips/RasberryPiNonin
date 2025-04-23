const bleno = require('@abandonware/bleno');
const { PrimaryService, Characteristic, Descriptor } = bleno;
const { execSync } = require('child_process');
const DEVICE_NAME = 'A&D_UC-352BLE_AA26F0';
const WEIGHT_SERVICE_UUID = '23434100-1FE4-1EFF-80CB-00FF78297D8B';
const WEIGHT_CHAR_UUID = '23434101-1FE4-1EFF-80CB-00FF78297D8B';
const DATE_TIME_UUID = '2A08';
const DIS_UUID = '180A';

// Sample weight = 79.4kg
function encodeWeightMeasurement() {
  const weightVal = Math.round(79.4 * 100); // 0.01 kg unit
  const now = new Date();
  const buffer = Buffer.alloc(10);
  buffer.writeUInt8(0x02, 0); // flags (unit in kg)
  buffer.writeUInt16LE(weightVal, 1);
  buffer.writeUInt16LE(now.getFullYear(), 3);
  buffer.writeUInt8(now.getMonth() + 1, 5);
  buffer.writeUInt8(now.getDate(), 6);
  buffer.writeUInt8(now.getHours(), 7);
  buffer.writeUInt8(now.getMinutes(), 8);
  buffer.writeUInt8(now.getSeconds(), 9);
  return buffer;
}

// Set MAC address before advertising
try {
    console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
    execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to set MAC address:', error.message);
}

const weightCharacteristic = new Characteristic({
  uuid: WEIGHT_CHAR_UUID,
  properties: ['notify'],
  descriptors: [
    new Descriptor({ uuid: '2901', value: 'Weight Measurement' })
  ],
  onSubscribe: (maxSize, updateCallback) => {
    console.log('Client subscribed to weight');
    const data = encodeWeightMeasurement();
    console.log('Sending:', data.toString('hex'));
    updateCallback(data);
  },
  onUnsubscribe: () => console.log('Client unsubscribed')
});

const dateTimeCharacteristic = new Characteristic({
  uuid: DATE_TIME_UUID,
  properties: ['write'],
  onWriteRequest: (data, offset, withoutResponse, callback) => {
    console.log('DateTime written:', data.toString('hex'));
    callback(Characteristic.RESULT_SUCCESS);
  }
});

const deviceInfoCharacteristics = [
  { uuid: '2A29', value: 'A&D Medical' },
  { uuid: '2A24', value: 'UC-352BLE' },
  { uuid: '2A25', value: '5200906508' },
  { uuid: '2A26', value: 'CWSP009_111' },
  { uuid: '2A27', value: '0.00' },
  { uuid: '2A28', value: '0.00' },
  { uuid: '2A23', value: Buffer.from('f026aafeffb51434', 'hex') },
].map(item => new Characteristic({
  uuid: item.uuid,
  properties: ['read'],
  value: Buffer.isBuffer(item.value) ? item.value : Buffer.from(item.value, 'utf-8')
}));

const weightService = new PrimaryService({
  uuid: WEIGHT_SERVICE_UUID,
  characteristics: [weightCharacteristic, dateTimeCharacteristic]
});

const deviceInfoService = new PrimaryService({
  uuid: DIS_UUID,
  characteristics: deviceInfoCharacteristics
});

// === BLE Lifecycle ===
bleno.on('stateChange', state => {
  console.log(`BLE state: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising(DEVICE_NAME, [WEIGHT_SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', error => {
  if (!error) {
    console.log('Advertising...');
    bleno.setServices([weightService, deviceInfoService]);
  } else {
    console.error('Advertising error:', error);
  }
});
