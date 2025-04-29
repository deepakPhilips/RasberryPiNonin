const bleno = require('@abandonware/bleno');
const { exec } = require('child_process');
const DATETIME_CHAR_UUID = '2A08';

const deviceInfoService  = ( props)=> new bleno.PrimaryService({
    uuid: '180A',
    characteristics: [
      new bleno.Characteristic({ uuid: '2A29', properties: ['read'], value: Buffer.from('Generic') }),
      new bleno.Characteristic({ uuid: '2A24', properties: ['read'], value: Buffer.from(props.type) }),
      new bleno.Characteristic({ uuid: '2A25', properties: ['read'], value: Buffer.from('123456789') }),
      new bleno.Characteristic({ uuid: '2A26', properties: ['read'], value: Buffer.from('1.0.0') }),
      new bleno.Characteristic({ uuid: '2A27', properties: ['read'], value: Buffer.from('1.0.0') }),
      new bleno.Characteristic({ uuid: '2A28', properties: ['read'], value: Buffer.from('1.0.0') }),
      new bleno.Characteristic({ uuid: '2A23', properties: ['read'], value: Buffer.from('aabbccddeeff0011', 'hex') }),
    ],
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

  function disconnectFromCentral() {
    exec('bluetoothctl disconnect', (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Failed to disconnect:', err);
      } else {
        console.log('✅ Disconnected from central to complete measurement');
      }
    });
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

  module.exports = {
    deviceInfoService,
    commandService,
    disconnectFromCentral,
    DateTimeCharacteristic
  }