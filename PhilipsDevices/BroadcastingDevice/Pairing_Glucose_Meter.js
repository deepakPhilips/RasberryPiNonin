const bleno = require('@abandonware/bleno');
const dbus = require('dbus-next');
const { Variant } = dbus;
const { Interface } = dbus.interface;
const { systemBus } = dbus;
const { execSync } = require('child_process');
const program = require('commander').program;
const { loadDeviceById } = require('./DeviceConfigLoader');

program
    .requiredOption('--deviceId <n>', 'device ID', parseInt)
    .option('--glucose <n>', 'glucose mg/dL', parseFloat);

program.parse(process.argv);
const options = program.opts();
const deviceConfig = loadDeviceById(options.deviceId);

if (typeof options.glucose !== 'number' || isNaN(options.glucose)) {
  console.error("❌ Invalid or missing --glucose. Provide a valid number (e.g., --glucose 127.5)");
  process.exit(1);
}

try {
  console.log('🛠️ Running set_mac.sh to update Bluetooth MAC...');
  execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to set MAC address:', error.message);
}

let glucoseNotifyCallback = null;
let racpIndicateCallback = null;

class NoInputNoOutputAgent extends Interface {
  constructor() { super('org.bluez.Agent1'); }
  RequestPinCode(device) { console.log(`RequestPinCode: ${device}`); return '0000'; }
  RequestPasskey(device) { return new Variant('u', 123456); }
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
      uuid: '2A18',
      properties: ['notify'],
    });
  }

  onSubscribe(_, callback) {
    glucoseNotifyCallback = callback;
    console.log('✅ Subscribed to Glucose Measurement');
  }

  onUnsubscribe() {
    glucoseNotifyCallback = null;
    console.log('❌ Unsubscribed from Glucose Measurement');
  }
}

class RACPCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: '2A52',
      properties: ['indicate', 'write'],
    });
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
    console.log('📥 Received RACP command:', data.toString('hex'));

    if (glucoseNotifyCallback) {
      console.log('🕒 Sending glucose measurement after RACP command...');
      setTimeout(sendGlucoseMeasurement, 1000); // 1 sec delay
    }

    if (racpIndicateCallback) {
      const racpResponse = Buffer.from([0x06, 0x01, 0x01, 0x00]); // RACP Success response
      racpIndicateCallback(racpResponse);
      console.log('📤 Sent RACP success indication');
    }

    callback(this.RESULT_SUCCESS);
  }

  onIndicate(callback) {
    racpIndicateCallback = callback;
  }
}

function encodeGlucoseMeasurement(glucoseMgDl) {
  const flags = 0x02; // Glucose concentration + type/location present, units in mg/dL
  const sequenceNumber = 1;
  const now = new Date();

  const buffer = Buffer.alloc(14);

  buffer.writeUInt8(flags, 0);             // Flags
  buffer.writeUInt16LE(sequenceNumber, 1); // Sequence Number
  buffer.writeUInt16LE(now.getFullYear(), 3);
  buffer.writeUInt8(now.getMonth() + 1, 5);
  buffer.writeUInt8(now.getDate(), 6);
  buffer.writeUInt8(now.getHours(), 7);
  buffer.writeUInt8(now.getMinutes(), 8);
  buffer.writeUInt8(now.getSeconds(), 9);

  const sfloat = encodeSFloat(glucoseMgDl * 0.00001);  // 🛠️ Correctly encode mg/dL directly
  buffer.writeUInt16LE(sfloat, 10);

  buffer.writeUInt8(0x11, 12); // Type (capillary whole blood) + Location (finger)

  buffer.writeUInt8(0x00, 13); // Sensor status (optional)

  return buffer;
}

function encodeSFloat(value) {
  if (value === 0) return 0;
  
  let exponent = 0;
  while (value < 2048 && exponent > -8) {
    value *= 10;
    exponent--;
  }
  while (value >= 2048) {
    value /= 10;
    exponent++;
  }
  const mantissa = Math.round(value);

  let exp = exponent & 0x0F; // Only 4 bits for exponent
  return ((exp << 12) & 0xF000) | (mantissa & 0x0FFF);
}

function sendGlucoseMeasurement() {
  console.log("🚀 ~ sendGlucoseMeasurement ~ options.glucose:", options.glucose);

  const buffer = encodeGlucoseMeasurement(options.glucose);
  console.log("🚀 ~ sendGlucoseMeasurement ~ buffer:", buffer);

  if (glucoseNotifyCallback) {
    glucoseNotifyCallback(buffer);
    console.log(`📤 Sent glucose measurement: ${options.glucose} mg/dL`);
  } else {
    console.warn('⚠️ No subscriber for glucose notify');
  }
}

const glucoseService = new bleno.PrimaryService({
  uuid: deviceConfig.broadcastingServiceID,
  characteristics: [
    new GlucoseMeasurementCharacteristic(),
    new RACPCharacteristic()
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
    bleno.setServices([deviceInfoService(deviceConfig), glucoseService]);
  } else {
    console.error('❌ Advertising error:', error);
  }
});

registerAgent().catch(console.error);
