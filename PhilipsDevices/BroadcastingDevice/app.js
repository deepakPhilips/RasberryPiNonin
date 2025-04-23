const bleno = require('@abandonware/bleno');
const dbus = require('dbus-next');
const { Variant } = dbus;
const { Interface } = require('dbus-next').interface;
const { systemBus } = dbus;
const { execSync } = require('child_process');

const WEIGHT_SERVICE_UUID = '23434100-1FE4-1EFF-80CB-00FF78297D8B';
const WEIGHT_CHAR_UUID = '23434101-1FE4-1EFF-80CB-00FF78297D8B';
const DATETIME_CHAR_UUID = '2A08';
const DEVICE_INFO_SERVICE_UUID = '180A';

let updateValueCallback = null;

try {
    console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
    execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to set MAC address:', error.message);
}

class NoInputNoOutputAgent extends Interface {
  constructor() {
    super('org.bluez.Agent1');
  }

  RequestPinCode(msg, device) {
    console.log(`RequestPinCode: ${device}`);
    return '0000';
  }

  RequestPasskey(msg, device) {
    console.log(`RequestPasskey: ${device}`);
    return new Variant('u', 123456);
  }

  RequestConfirmation(msg, device, passkey) {
    console.log(`RequestConfirmation: ${passkey} for ${device}`);
  }

  AuthorizeService(msg, device, uuid) {
    console.log(`AuthorizeService for ${uuid}`);
  }

  Cancel(msg, device) {
    console.log(`Cancel for ${device}`);
  }

  Release(msg) {
    console.log('Agent released');
  }
}

NoInputNoOutputAgent.$methods = {
  RequestPinCode: ['o', 's', []],
  RequestPasskey: ['o', 'u', []],
  RequestConfirmation: ['ou', '', []],
  AuthorizeService: ['os', '', []],
  Cancel: ['o', '', []],
  Release: ['', '', []],
};

async function registerAgent() {
  const bus = systemBus();
  const agent = new NoInputNoOutputAgent();
  const AGENT_PATH = '/test/agent';

  bus.export(AGENT_PATH, agent);

  const bluez = await bus.getProxyObject('org.bluez', '/org/bluez');
  const agentManager = bluez.getInterface('org.bluez.AgentManager1');

  await agentManager.RegisterAgent(AGENT_PATH, 'NoInputNoOutput');
  await agentManager.RequestDefaultAgent(AGENT_PATH);
  console.log('✅ Pairing agent registered and set as default');
}

class WeightCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: WEIGHT_CHAR_UUID,
      properties: ['notify'],
    });
  }

  onSubscribe(maxValueSize, callback) {
    updateValueCallback = callback;
    console.log('Subscribed to weight notify');
    setTimeout(() => {
      const buffer = Buffer.from('021a03e90704170d3a1e', 'hex'); // 79.4kg
      updateValueCallback(buffer);
      console.log('Measurement sent');
    }, 2000);
  }

  onUnsubscribe() {
    console.log('Unsubscribed');
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
    console.log('Received DateTime:', data.toString('hex'));
    callback(this.RESULT_SUCCESS);
  }
}

const weightService = new bleno.PrimaryService({
  uuid: WEIGHT_SERVICE_UUID,
  characteristics: [
    new WeightCharacteristic(),
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

bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    bleno.startAdvertising('A&D_UC-352BLE_AA26F0', [WEIGHT_SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('✅ Advertising started');
    bleno.setServices([deviceInfoService, weightService]);
  } else {
    console.error('❌ Advertising error:', error);
  }
});

// Launch everything
registerAgent().catch(console.error);
