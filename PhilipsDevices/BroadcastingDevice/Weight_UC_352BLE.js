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

try {
  console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
  execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to set MAC address:', error.message);
}


program
    .option('--weight <n>', 'weight', parseFloat);

program.parse(process.argv);
const options = program.opts(); 
const deviceConfig = loadDeviceById(14);
// const DEVICE_TYPE = deviceConfig.type;



if (typeof options.weight !== 'number' || isNaN(options.weight)) {
  console.error("❌ Invalid or missing --weight. Please provide a valid number (e.g. --weight 78.5)");
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

class WeightCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: deviceConfig.characteristicID,
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
  uuid: deviceConfig.broadcastingServiceID,
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
    bleno.startAdvertising(deviceConfig.broadcastingName, [deviceConfig.broadcastingServiceID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('✅ Advertising started');
    bleno.setServices([deviceInfoService, weightService, commandService]);
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
  
  if(deviceConfig.requiresPairing === true) {
// Launch everything
registerAgent().catch(console.error);
  }



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