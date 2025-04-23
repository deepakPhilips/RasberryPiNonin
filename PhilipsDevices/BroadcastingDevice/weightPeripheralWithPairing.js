const bleno = require('@abandonware/bleno');
const dbus = require('dbus-next');
const { Interface } = dbus.interface;
const bus = dbus.systemBus();
const { execSync } = require('child_process');

const DEVICE_NAME = 'A&D_UC-352BLE_AA26F0';
const WEIGHT_SERVICE_UUID = '23434100-1FE4-1EFF-80CB-00FF78297D8B';
const WEIGHT_CHAR_UUID = '23434101-1FE4-1EFF-80CB-00FF78297D8B';
const DATE_TIME_UUID = '2A08';
const DIS_UUID = '180A';

// Set MAC address before advertising
try {
  console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
  execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to set MAC address:', error.message);
}

function encodeWeightMeasurement() {
  const weightVal = Math.round(79.4 * 100);
  const now = new Date();
  const buffer = Buffer.alloc(10);
  buffer.writeUInt8(0x02, 0);
  buffer.writeUInt16LE(weightVal, 1);
  buffer.writeUInt16LE(now.getFullYear(), 3);
  buffer.writeUInt8(now.getMonth() + 1, 5);
  buffer.writeUInt8(now.getDate(), 6);
  buffer.writeUInt8(now.getHours(), 7);
  buffer.writeUInt8(now.getMinutes(), 8);
  buffer.writeUInt8(now.getSeconds(), 9);
  return buffer;
}

const weightCharacteristic = new bleno.Characteristic({
  uuid: WEIGHT_CHAR_UUID,
  properties: ['notify'],
  descriptors: [new bleno.Descriptor({ uuid: '2901', value: 'Weight Measurement' })],
  onSubscribe: (maxSize, updateCallback) => {
    console.log('Client subscribed to weight');
    const data = encodeWeightMeasurement();
    updateCallback(data);
  },
  onUnsubscribe: () => console.log('Client unsubscribed')
});

const dateTimeCharacteristic = new bleno.Characteristic({
  uuid: DATE_TIME_UUID,
  properties: ['write'],
  onWriteRequest: (data, offset, withoutResponse, callback) => {
    console.log('DateTime written:', data.toString('hex'));
    callback(bleno.Characteristic.RESULT_SUCCESS);
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
].map(item => new bleno.Characteristic({
  uuid: item.uuid,
  properties: ['read'],
  value: Buffer.isBuffer(item.value) ? item.value : Buffer.from(item.value, 'utf-8')
}));

const weightService = new bleno.PrimaryService({
  uuid: WEIGHT_SERVICE_UUID,
  characteristics: [weightCharacteristic, dateTimeCharacteristic]
});
const deviceInfoService = new bleno.PrimaryService({
  uuid: DIS_UUID,
  characteristics: deviceInfoCharacteristics
});

class NoInputNoOutputAgent extends Interface {
  constructor() {
    super('org.bluez.Agent1');
  }
  RequestPinCode(device) { console.log(`RequestPinCode for ${device}`); return Promise.resolve('0000'); }
  RequestPasskey(device) { console.log(`RequestPasskey for ${device}`); return Promise.resolve(123456); }
  RequestConfirmation(device, passkey) { console.log(`RequestConfirmation: ${passkey}`); return Promise.resolve(); }
  AuthorizeService(device, uuid) { console.log(`AuthorizeService: ${uuid}`); return Promise.resolve(); }
  Cancel(device) { console.log(`Cancel for ${device}`); }
  Release() { console.log('Agent released'); }
}

async function setupPairingAgent() {
  const bluez = await bus.getProxyObject('org.bluez', '/org/bluez');
  const agentMgr = bluez.getInterface('org.bluez.AgentManager1');

  const adapterObj = await bus.getProxyObject('org.bluez', '/org/bluez/hci0');
  const adapterProps = adapterObj.getInterface('org.freedesktop.DBus.Properties');

  await adapterProps.Set('org.bluez.Adapter1', 'Powered', new dbus.Variant('b', true));
  await adapterProps.Set('org.bluez.Adapter1', 'Discoverable', new dbus.Variant('b', true));
  await adapterProps.Set('org.bluez.Adapter1', 'Pairable', new dbus.Variant('b', true));

  const agent = new NoInputNoOutputAgent();
  await bus.export('/org/bluez/agent/node', agent);
  await agentMgr.RegisterAgent('/org/bluez/agent/node', 'NoInputNoOutput');
  await agentMgr.RequestDefaultAgent('/org/bluez/agent/node');

  console.log('✅ Bluetooth adapter ready and pairing agent active');
}

bleno.on('stateChange', async state => {
  if (state === 'poweredOn') {
    await setupPairingAgent();
    bleno.startAdvertising(DEVICE_NAME, [WEIGHT_SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', err => {
  if (!err) {
    console.log('🚀 Advertising weight scale with pairing');
    bleno.setServices([weightService, deviceInfoService]);
  }
});
