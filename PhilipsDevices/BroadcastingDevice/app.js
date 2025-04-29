const bleno = require('@abandonware/bleno');
const dbus = require('dbus-next');
const { Variant } = dbus;
const { Interface } = require('dbus-next').interface;
const { systemBus } = dbus;
const { execSync, exec } = require('child_process');
const program = require('commander').program;

const WEIGHT_SERVICE_UUID = '1810';
const WEIGHT_CHAR_UUID = '23434101-1FE4-1EFF-80CB-00FF78297D8B';
const DATETIME_CHAR_UUID = '2A08';
const DEVICE_INFO_SERVICE_UUID = '180A';
const DeviceName = 'BLEsmart_000000D7FA';
program
    .requiredOption('--deviceId <n>', 'deviceId', parseInt)
    .option('--weight <n>', 'weight', parseFloat);

program.parse(process.argv);
const options = program.opts(); 

let updateValueCallback = null;

try {
    console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
    execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to set MAC address:', error.message);
}

if (typeof options.weight !== 'number' || isNaN(options.weight)) {
    console.error("❌ Invalid or missing --weight. Please provide a valid number (e.g. --weight 78.5)");
    process.exit(1);
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
    setTimeout(sendDynamicWeight, 2000);

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
    bleno.startAdvertising(DeviceName, [WEIGHT_SERVICE_UUID]);
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

class CommandControlCharacteristic extends bleno.Characteristic {
    constructor() {
      super({
        uuid: '233BF001-5A34-1B6D-975C-000D5690ABE4',
        properties: ['write'],
      });
    }
  
    onWriteRequest(data, offset, withoutResponse, callback) {
      const hex = data.toString('hex');
      console.log('✅ Control characteristic received:', hex);
  
      // Respond to specific commands
      if (hex === '0301a601') {
        console.log('→ Enable measurement buffer');
      } else if (hex === '020112') {
        console.log('→ Delete existing measurements');
      } else {
        console.log('→ Unknown control command');
      }
  
      callback(this.RESULT_SUCCESS);
    }
  }

  const commandService = new bleno.PrimaryService({
    uuid: '233BF000-5A34-1B6D-975C-000D5690ABE4',
    characteristics: [new CommandControlCharacteristic()],
  });
  
// Launch everything
registerAgent().catch(console.error);


function encodeMeasurement(weightKg) {
    const flags = 0x02;
    const weightHg = Math.round(weightKg * 10); // kg → hectograms (2 decimal precision)
    const now = new Date();
  
    const buffer = Buffer.alloc(10);
    buffer.writeUInt8(flags, 0);
    buffer.writeUInt16LE(weightHg, 1); // 2 bytes for weight
    buffer.writeUInt16LE(now.getFullYear(), 3);
    buffer.writeUInt8(now.getMonth() + 1, 5); // Month is 0-indexed
    buffer.writeUInt8(now.getDate(), 6);
    buffer.writeUInt8(now.getHours(), 7);
    buffer.writeUInt8(now.getMinutes(), 8);
    buffer.writeUInt8(now.getSeconds(), 9);
  
    return buffer;
  }
  
  function sendDynamicWeight() {
    const buffer = encodeMeasurement(options.weight);
  
    if (typeof updateValueCallback === 'function') {
      updateValueCallback(buffer);
      console.log(`📤 Sent dynamic weight: ${options.weight.toFixed(1)} kg`);
      setTimeout(() => {
        disconnectFromCentral();
      }, 1000);
    } else {
      console.warn('⚠️ No subscriber to send weight to');
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

// // DateTime (2A08) - writable
// class DateTimeCharacteristic extends bleno.Characteristic {
//   constructor() {
//     super({ uuid: '2A08', properties: ['write'] });
//   }
//   onWriteRequest(data, offset, withoutResponse, callback) {
//     console.log('🕒 DateTime written:', data.toString('hex'));
//     callback(this.RESULT_SUCCESS);
//   }
// }


// Blood Pressure Service
const bpService = new bleno.PrimaryService({
  uuid: BP_SERVICE_UUID,
  characteristics: [
    new BloodPressureMeasurement(),
    new DateTimeCharacteristic()
  ]
})