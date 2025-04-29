const bleno = require('@abandonware/bleno');
const dbus = require('dbus-next');
const { Variant } = dbus;
const { Interface } = require('dbus-next').interface;
const { systemBus } = dbus;
const { execSync } = require('child_process');
const program = require('commander').program;
const { loadDeviceById } = require('./DeviceConfigLoader');

const DEVICE_INFO_SERVICE_UUID = '180A';
const DATETIME_CHAR_UUID = '2A08';

program
    .requiredOption('--deviceId <n>', 'device ID', parseInt)
    .option('--glucose <n>', 'glucose mg/dL', parseFloat);

program.parse(process.argv);
const options = program.opts(); 
const deviceConfig = loadDeviceById(options.deviceId);

if (typeof options.glucose !== 'number' || isNaN(options.glucose)) {
  console.error("❌ Invalid or missing --glucose. Please provide a valid number (e.g. --glucose 125)");
  process.exit(1);
}

try {
  console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
  execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to set MAC address:', error.message);
}

let updateValueCallback = null;

// Bluetooth pairing agent
class NoInputNoOutputAgent extends Interface {
  constructor() {
    super('org.bluez.Agent1');
  }
  RequestPinCode(device) { console.log(`RequestPinCode: ${device}`); return '0000'; }
  RequestPasskey(device) { console.log(`RequestPasskey: ${device}`); return new Variant('u', 123456); }
  RequestConfirmation(device, passkey) { console.log(`RequestConfirmation: ${passkey}`); }
  AuthorizeService(device, uuid) { console.log(`AuthorizeService for ${uuid}`); }
  Cancel(device) { console.log(`Cancel for ${device}`); }
  Release() { console.log('Agent released'); }
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
  console.log('✅ Pairing agent registered');
}

class GlucoseMeasurementCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: deviceConfig.characteristicID,
      properties: ['notify'],
    });
  }

  onSubscribe(_, callback) {
    updateValueCallback = callback;
    console.log('✅ Subscribed to glucose notify');
    setTimeout(sendGlucoseMeasurement, 2000);
  }

  onUnsubscribe() {
    updateValueCallback = null;
    console.log('❌ Unsubscribed from glucose notify');
  }
}

function encodeGlucoseMeasurement(glucoseMgDl) {
  const flags = 0x00; // no optional fields
  const seqNumber = 1;
  const now = new Date();

  const buffer = Buffer.alloc(10);
  buffer.writeUInt8(flags, 0);
  buffer.writeUInt16LE(seqNumber, 1);
  buffer.writeUInt16LE(now.getFullYear(), 3);
  buffer.writeUInt8(now.getMonth() + 1, 5);
  buffer.writeUInt8(now.getDate(), 6);
  buffer.writeUInt8(now.getHours(), 7);
  buffer.writeUInt8(now.getMinutes(), 8);
  buffer.writeUInt8(now.getSeconds(), 9);

  // glucose value (sfloat) comes next in real packets — skipping for minimal implementation

  return buffer;
}

function sendGlucoseMeasurement() {
  const buffer = encodeGlucoseMeasurement(options.glucose);
  if (typeof updateValueCallback === 'function') {
    updateValueCallback(buffer);
    console.log(`📤 Sent glucose: ${options.glucose.toFixed(1)} mg/dL`);
  } else {
    console.warn('⚠️ No subscriber to send glucose to');
  }
}

const glucoseService = new bleno.PrimaryService({
  uuid: deviceConfig.broadcastingServiceID,
  characteristics: [new GlucoseMeasurementCharacteristic()],
});

const deviceInfoService = new bleno.PrimaryService({
  uuid: DEVICE_INFO_SERVICE_UUID,
  characteristics: [
    new bleno.Characteristic({ uuid: '2A29', properties: ['read'], value: Buffer.from('Generic') }),
    new bleno.Characteristic({ uuid: '2A24', properties: ['read'], value: Buffer.from('Glucose Meter') }),
    new bleno.Characteristic({ uuid: '2A25', properties: ['read'], value: Buffer.from('123456789') }),
    new bleno.Characteristic({ uuid: '2A26', properties: ['read'], value: Buffer.from('1.0.0') }),
    new bleno.Characteristic({ uuid: '2A27', properties: ['read'], value: Buffer.from('1.0.0') }),
    new bleno.Characteristic({ uuid: '2A28', properties: ['read'], value: Buffer.from('1.0.0') }),
    new bleno.Characteristic({ uuid: '2A23', properties: ['read'], value: Buffer.from('aabbccddeeff0011', 'hex') }),
  ],
});

bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    bleno.startAdvertising(deviceConfig.broadcastingName, [deviceConfig.broadcastingServiceID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('✅ Advertising started');
    bleno.setServices([deviceInfoService, glucoseService]);
  } else {
    console.error('❌ Advertising failed:', error);
  }
});

// Always register agent if pairing is required
if (deviceConfig.requiresPairing || deviceConfig.requiresOSPairing) {
  registerAgent().catch(console.error);
}
