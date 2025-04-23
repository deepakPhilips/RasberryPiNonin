const bleno = require('@abandonware/bleno');
const dbus = require('dbus-next');
const { Interface, method } = dbus.interface;

const WEIGHT_SERVICE_UUID = '23434100-1FE4-1EFF-80CB-00FF78297D8B';
const WEIGHT_CHAR_UUID = '23434101-1FE4-1EFF-80CB-00FF78297D8B';
const DATETIME_CHAR_UUID = '2A08';
const DEVICE_INFO_SERVICE_UUID = '180A';

let updateValueCallback = null;

const bus = dbus.systemBus();

class NoInputNoOutputAgent extends Interface {
  constructor() {
    super('org.bluez.Agent1');
  }

  @method({ inSignature: 'o', outSignature: 's' })
  RequestPinCode(device) {
    console.log(`RequestPinCode for ${device}`);
    return '0000';
  }

  @method({ inSignature: 'o', outSignature: 'u' })
  RequestPasskey(device) {
    console.log(`RequestPasskey for ${device}`);
    return 123456;
  }

  @method({ inSignature: 'ou', outSignature: '' })
  RequestConfirmation(device, passkey) {
    console.log(`RequestConfirmation: ${passkey} for ${device}`);
  }

  @method({ inSignature: 'os', outSignature: '' })
  AuthorizeService(device, uuid) {
    console.log(`AuthorizeService: ${uuid}`);
  }

  @method({ inSignature: 'o', outSignature: '' })
  Cancel(device) {
    console.log(`Cancel pairing for ${device}`);
  }

  @method({ inSignature: '', outSignature: '' })
  Release() {
    console.log('Agent released');
  }
}

async function registerAgent() {
  const path = '/test/agent';
  const agent = new NoInputNoOutputAgent();
  bus.export(path, agent);

  const bluez = await bus.getProxyObject('org.bluez', '/org/bluez');
  const agentManager = bluez.getInterface('org.bluez.AgentManager1');

  await agentManager.RegisterAgent(path, 'NoInputNoOutput');
  console.log('✅ Pairing agent registered with NoInputNoOutput');

  await agentManager.RequestDefaultAgent(path);
  console.log('✅ Default agent set');
}

class WeightMeasurementCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: WEIGHT_CHAR_UUID,
      properties: ['notify'],
    });
  }

  onSubscribe(maxValueSize, callback) {
    console.log('✅ Subscribed to weight characteristic');
    updateValueCallback = callback;

    setTimeout(() => {
      const data = Buffer.from('021a03e90704170d3a1e', 'hex'); // 79.4 kg
      console.log('📤 Sending weight measurement');
      callback(data);
    }, 2000);
  }

  onUnsubscribe() {
    console.log('❎ Unsubscribed from weight characteristic');
    updateValueCallback = null;
  }
}

class DateTimeCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: DATETIME_CHAR_UUID,
      properties: ['write'],
    });
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
    console.log('🕒 Received DateTime write:', data.toString('hex'));
    callback(this.RESULT_SUCCESS);
  }
}

const weightService = new bleno.PrimaryService({
  uuid: WEIGHT_SERVICE_UUID,
  characteristics: [
    new WeightMeasurementCharacteristic(),
    new DateTimeCharacteristic(),
  ],
});

const deviceInfoService = new bleno.PrimaryService({
  uuid: DEVICE_INFO_SERVICE_UUID,
  characteristics: [
    new bleno.Characteristic({ uuid: '2A29', properties: ['read'], value: Buffer.from('A&D Medical') }),
    new bleno.Characteristic({ uuid: '2A24', properties: ['read'], value: Buffer.from('UC-352BLE') }),
    new bleno.Characteristic({ uuid: '2A25', properties: ['read'], value: Buffer.from('5200906508') }),
    new bleno.Characteristic({ uuid: '2A26', properties: ['read'], value: Buffer.from('CWSP009_111') }),
    new bleno.Characteristic({ uuid: '2A27', properties: ['read'], value: Buffer.from('0.00') }),
    new bleno.Characteristic({ uuid: '2A28', properties: ['read'], value: Buffer.from('0.00') }),
    new bleno.Characteristic({ uuid: '2A23', properties: ['read'], value: Buffer.from('f026aafeffb51434', 'hex') }),
  ],
});

// Handle BLE state changes
bleno.on('stateChange', (state) => {
  console.log(`BLE state changed to: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising('A&D_UC-352BLE_AA26F0', [WEIGHT_SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('🚀 BLE advertising started');
    bleno.setServices([deviceInfoService, weightService]);
  } else {
    console.error('❌ Advertising start error:', error);
  }
});

// Register pairing agent and launch BLE peripheral
registerAgent()
  .then(() => console.log('🔒 Pairing agent ready'))
  .catch((err) => console.error('❌ Pairing setup failed:', err));
