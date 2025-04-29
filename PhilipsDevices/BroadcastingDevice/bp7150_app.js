const bleno = require('@abandonware/bleno');
const dbus = require('dbus-next');
const { Variant } = dbus;
const { Interface } = dbus.interface;
const { systemBus } = dbus;
const { execSync, exec } = require('child_process');
const DEVICE_NAME = 'BLEsmart_000000D7FA';
const BP_SERVICE_UUID = '1810';
const DEVICE_INFO_UUID = '180A';

let updateValueCallback = null;

// Pairing agent (NoInputNoOutput)
class NoInputNoOutputAgent extends Interface {
  constructor() {
    super('org.bluez.Agent1');
  }
  RequestPinCode(device) { console.log(`RequestPinCode: ${device}`); return '0000'; }
  RequestPasskey(device) { console.log(`RequestPasskey: ${device}`); return new Variant('u', 123456); }
  RequestConfirmation(device, passkey) { console.log(`RequestConfirmation: ${passkey} for ${device}`); }
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

// Blood Pressure Measurement (2A35)
class BloodPressureMeasurement extends bleno.Characteristic {
  constructor() {
    super({ uuid: '2A35', properties: ['indicate'] });
  }
  onSubscribe(_, callback) {
    updateValueCallback = callback;
    console.log('✅ Subscribed to BP notify');
    setTimeout(sendBPMeasurement, 2000);
  }
  onUnsubscribe() {
    updateValueCallback = null;
    console.log('❌ Unsubscribed from BP notify');
  }
}

function encodeBPMeasurement(systolic, diastolic, pulseRate) {
  const buffer = Buffer.alloc(16); // Was 15, now correctly 16

  buffer.writeUInt8(0x1E, 0); // Flags
  buffer.writeUInt16LE(systolic * 10, 1);
  buffer.writeUInt16LE(diastolic * 10, 3);
  buffer.writeUInt16LE(80 * 10, 5); // MAP

  const now = new Date();
  buffer.writeUInt16LE(now.getFullYear(), 7);
  buffer.writeUInt8(now.getMonth() + 1, 9);
  buffer.writeUInt8(now.getDate(), 10);
  buffer.writeUInt8(now.getHours(), 11);
  buffer.writeUInt8(now.getMinutes(), 12);
  buffer.writeUInt8(now.getSeconds(), 13);

  buffer.writeUInt16LE(pulseRate * 10, 14);  // ✅ Now safe at offset 14

  return buffer;
}


function sendBPMeasurement() {
  const buffer = encodeBPMeasurement(120, 80, 72);
  if (typeof updateValueCallback === 'function') {
    updateValueCallback(buffer);
    console.log('📤 Sent BP: 120/80 mmHg, Pulse: 72');
    setTimeout(disconnectFromCentral, 1000);
  } else {
    console.warn('⚠️ No subscriber to send BP');
  }
}

function disconnectFromCentral() {
  exec('bluetoothctl disconnect', (err) => {
    if (err) {
      console.error('❌ Disconnect failed:', err);
    } else {
      console.log('✅ Disconnected after BP send');
    }
  });
}

// DateTime (2A08) - writable
class DateTimeCharacteristic extends bleno.Characteristic {
  constructor() {
    super({ uuid: '2A08', properties: ['write'] });
  }
  onWriteRequest(data, offset, withoutResponse, callback) {
    console.log('🕒 DateTime written:', data.toString('hex'));
    callback(this.RESULT_SUCCESS);
  }
}

// Device Info Service
const deviceInfoService = new bleno.PrimaryService({
  uuid: DEVICE_INFO_UUID,
  characteristics: [
    new bleno.Characteristic({ uuid: '2A29', properties: ['read'], value: Buffer.from('Omron') }),
    new bleno.Characteristic({ uuid: '2A24', properties: ['read'], value: Buffer.from('BP7150') }),
    new bleno.Characteristic({ uuid: '2A25', properties: ['read'], value: Buffer.from('000000D7FA') }),
    new bleno.Characteristic({ uuid: '2A26', properties: ['read'], value: Buffer.from('1.0.0') }),
    new bleno.Characteristic({ uuid: '2A27', properties: ['read'], value: Buffer.from('1.0.0') }),
    new bleno.Characteristic({ uuid: '2A28', properties: ['read'], value: Buffer.from('1.0.0') }),
    new bleno.Characteristic({ uuid: '2A23', properties: ['read'], value: Buffer.from('d7fa000000000000', 'hex') }),
  ],
});

// Blood Pressure Service
const bpService = new bleno.PrimaryService({
  uuid: BP_SERVICE_UUID,
  characteristics: [
    new BloodPressureMeasurement(),
    new DateTimeCharacteristic()
  ]
});

try {
    console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
    execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to set MAC address:', error.message);
}

// Start BLE
bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    bleno.startAdvertising(DEVICE_NAME, [BP_SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('✅ Advertising started as', DEVICE_NAME);
    bleno.setServices([deviceInfoService, bpService]);
  } else {
    console.error('❌ Advertising failed:', error);
  }
});

// Register pairing agent
registerAgent().catch(console.error);
