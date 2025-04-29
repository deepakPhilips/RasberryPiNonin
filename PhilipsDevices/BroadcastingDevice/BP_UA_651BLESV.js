const bleno = require('@abandonware/bleno');
const dbus = require('dbus-next');
const { Variant } = dbus;
const { Interface } = require('dbus-next').interface;
const { systemBus } = dbus;
const { execSync, exec } = require('child_process');
const program = require('commander').program;
const { loadDeviceById } = require('./DeviceConfigLoader');

const DATETIME_CHAR_UUID = '2A08';
const DEVICE_INFO_SERVICE_UUID = '180A';
let readyToSendMeasurement = false; 

try {
  console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
  execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to set MAC address:', error.message);
}

program
  .requiredOption('--deviceId <n>', 'device ID', parseInt)
  .option('--systolic <n>', 'Systolic pressure', parseInt)
  .option('--diastolic <n>', 'Diastolic pressure', parseInt)
  .option('--pulse <n>', 'Pulse rate', parseInt);

program.parse(process.argv);
const options = program.opts();
const deviceConfig = loadDeviceById(options.deviceId);

if (isNaN(options.systolic) || isNaN(options.diastolic) || isNaN(options.pulse)) {
  console.error("❌ Please provide --systolic, --diastolic, and --pulse values.");
  process.exit(1);
}

let updateValueCallback = null;

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

class BloodPressureCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: deviceConfig.characteristicID,
      properties: ['notify'],
    });
  }

  onSubscribe(maxValueSize, callback) {
    if (readyToSendMeasurement) {
        updateValueCallback = callback;
        console.log('Subscribed to BP notify');
        setTimeout(sendDynamicBPMeasurement, 2000);
      } else {
        console.log('⛔ Cannot send yet, waiting for control writes.');
      }
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

const bpService = new bleno.PrimaryService({
  uuid: deviceConfig.broadcastingServiceID,
  characteristics: [
    new BloodPressureCharacteristic(),
    new DateTimeCharacteristic(),
  ],
});

const deviceInfoService = new bleno.PrimaryService({
  uuid: DEVICE_INFO_SERVICE_UUID,
  characteristics: [
    new bleno.Characteristic({ uuid: '2A29', properties: ['read'], value: Buffer.from('A&D Medical') }),
    new bleno.Characteristic({ uuid: '2A24', properties: ['read'], value: Buffer.from('UA-656BLE') }),
    new bleno.Characteristic({ uuid: '2A25', properties: ['read'], value: Buffer.from('123456789') }),
    new bleno.Characteristic({ uuid: '2A26', properties: ['read'], value: Buffer.from('Firmware_1.0') }),
    new bleno.Characteristic({ uuid: '2A27', properties: ['read'], value: Buffer.from('1.0') }),
    new bleno.Characteristic({ uuid: '2A28', properties: ['read'], value: Buffer.from('1.0') }),
    new bleno.Characteristic({ uuid: '2A23', properties: ['read'], value: Buffer.from('f026aafeffb51434', 'hex') }),
  ],
});

bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    bleno.startAdvertising('A&D_UA-651BLE', [deviceConfig.broadcastingServiceID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('✅ Advertising started');
    bleno.setServices([deviceInfoService, bpService, commandService]);
  } else {
    console.error('❌ Advertising error:', error);
  }
});

if (deviceConfig.requiresPairing === true) {
  registerAgent().catch(console.error);
}

function encodeBPMeasurement(systolic, diastolic, pulse) {
  const flags = 0x1E; // All present: units mmHg, timestamp, pulse rate
  const now = new Date();
  const buffer = Buffer.alloc(19);

  buffer.writeUInt8(flags, 0);
  buffer.writeUInt16LE(systolic , 1);
  buffer.writeUInt16LE(diastolic , 3);
  buffer.writeUInt16LE(diastolic , 5); // MAP (mean arterial pressure) = same as diastolic for now
  buffer.writeUInt16LE(now.getFullYear(), 7);
  buffer.writeUInt8(now.getMonth() + 1, 9);
  buffer.writeUInt8(now.getDate(), 10);
  buffer.writeUInt8(now.getHours(), 11);
  buffer.writeUInt8(now.getMinutes(), 12);
  buffer.writeUInt8(now.getSeconds(), 13);
  buffer.writeUInt16LE(pulse , 14);
  buffer.writeUInt8(1, 16); // User ID
  buffer.writeUInt8(0, 17); // Measurement Status
  return buffer;
}

function sendDynamicBPMeasurement() {
  const buffer = encodeBPMeasurement(options.systolic, options.diastolic, options.pulse);

  if (typeof updateValueCallback === 'function') {
    updateValueCallback(buffer);
    console.log(`📤 Sent BP: ${options.systolic}/${options.diastolic} mmHg, Pulse: ${options.pulse} bpm`);
    setTimeout(() => {
      disconnectFromCentral();
    }, 1000);
  } else {
    console.warn('⚠️ No subscriber to send BP to');
  }
}

function disconnectFromCentral() {
  exec('bluetoothctl disconnect', (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Failed to disconnect:', err);
    } else {
      console.log('✅ Disconnected from central to complete measurement');
    }
  });
}


const ControlCharacteristic = new bleno.Characteristic({
    uuid: CONTROL_CHARACTERISTIC_UUID,
    properties: ['write', 'writeWithoutResponse'],
    onWriteRequest: (data, offset, withoutResponse, callback) => {
      console.log('✅ Received Control command:', data.toString('hex'));
  
      if (data.equals(Buffer.from('0301a601', 'hex'))) {
        console.log('➡️ Enable measurement buffer command received');
      }
      if (data.equals(Buffer.from('020112', 'hex'))) {
        console.log('➡️ Delete existing measurements command received');
      }
  
      readyToSendMeasurement = true;  // ✅ Set after both writes
      callback(bleno.Characteristic.RESULT_SUCCESS);
    }
  });

  const commandService = new bleno.PrimaryService({
    uuid: '233BF000-5A34-1B6D-975C-000D5690ABE4',
    characteristics: [new ControlCharacteristic()],
  });