const bleno = require('@abandonware/bleno');
const program = require('commander').program;
const deviceConfig = require('./BloodPressureDeviceConfig.json');
const { createPrimaryService } = require('./BloodPressureService');
const { createNotifyCharacteristic } = require('./BloodPressureCharacteristic');
const deviceInfoService = require('./DeviceInfoService');

let counter = 0;

program
  .requiredOption('--sys <n>', 'Systolic pressure', parseInt)
  .requiredOption('--dia <n>', 'Diastolic pressure', parseInt)
  .requiredOption('--pulse <n>', 'Pulse rate', parseInt)
  .parse(process.argv);

const options = program.opts();

bleno.on('stateChange', (state) => {
  console.log('BLE Blood Pressure Monitor - state change:', state);
  if (state === 'poweredOn') {
    bleno.startAdvertising(deviceConfig.broadcastingName, [deviceConfig.broadcastingServiceID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('indicateConfirmation', () => {
    console.log('✅ Reading confirmed — disconnecting...');
    bleno.disconnect(); // cleanly disconnect
    process.exit(0);
  });

bleno.on('advertisingStart', (error) => {
  if (error) {
    console.error('Advertising start error:', error);
    return;
  }

  console.log('Started advertising...');
  bleno.setServices([
    createPrimaryService(deviceConfig.readingServiceID, [
      createNotifyCharacteristic(
        deviceConfig.characteristicID,
        'Blood Pressure Measurement',
        handleMeasurementSubscribe,
        handleMeasurementUnsubscribe
      )
    ]),
    deviceInfoService
  ]);
});

bleno.on('accept', (addr) => {
  console.log(`Accepted connection from ${addr}`);
});

bleno.on('disconnect', () => {
  console.log('Disconnected from client');
  process.exit(0);
});
function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
  console.log('✅ Validic subscribed — sending BP data');

  const buffer = buildBloodPressurePacket(); // this should return a proper 2A35 packet
  console.log('🩺 Sending BP Packet (hex):', buffer.toString('hex'));

  updateValueCallback(buffer);
}

function handleMeasurementUnsubscribe() {
  console.log('Client unsubscribed from measurement');
  process.exit(0);
}

// // Builds the simulated blood pressure packet based on 2A35 spec
// function buildBloodPressurePacket() {
//   counter++;
//   const flags = 0b00000000; // No timestamp, no pulse in kPa
//   const buffer = Buffer.alloc(13);

//   buffer.writeUInt8(flags, 0);
//   buffer.writeUInt16LE(options.sys, 1);   // Systolic
//   buffer.writeUInt16LE(options.dia, 3);   // Diastolic
//   buffer.writeUInt16LE(Math.round((options.sys + options.dia) / 2), 5); // MAP (mean)
//   buffer.writeUInt8(0, 7); // No timestamp
//   buffer.writeUInt16LE(options.pulse, 8); // Pulse rate
//   buffer.writeUInt8(counter % 256, 10);   // User ID / sequence
//   buffer.writeUInt8(0, 11); // Measurement status (optional)
//   buffer.writeUInt8(0, 12);

//   return buffer;
// }


function sfloatFromNumber(num) {
    let exponent = 0;
    let mantissa = Math.round(num);
  
    if (mantissa < 0) {
      mantissa = (1 << 12) + mantissa; // 2's complement
    }
  
    
    function sfloatFromNumber(value) {
        if (isNaN(value)) return Buffer.from([0xFF, 0xFF]); // special "NaN" value
      
        let exponent = 0;
        let mantissa = value;
      
        // Scale down if value is too big for 12-bit signed
        while (mantissa > 2047) {
          mantissa = mantissa / 10;
          exponent++;
        }
      
        mantissa = Math.round(mantissa);
      
        // Two's complement for negative mantissas
        if (mantissa < 0) {
          mantissa = (1 << 12) + mantissa;
        }
      
        const sfloat = (exponent << 12) | (mantissa & 0x0FFF);
        const buffer = Buffer.alloc(2);
        buffer.writeUInt16LE(sfloat, 0);
        return buffer;
      }
      
  
  function buildBloodPressurePacket() {
    counter++;
    const buffer = Buffer.alloc(13);
  
    const flags = 0b00011110; // mmHg, Pulse + User ID + Measurement Status
    buffer.writeUInt8(flags, 0);
  
    sfloatFromNumber(options.sys).copy(buffer, 1); // Systolic
    sfloatFromNumber(options.dia).copy(buffer, 3); // Diastolic
    sfloatFromNumber((options.sys + options.dia) / 2).copy(buffer, 5); // MAP
    sfloatFromNumber(options.pulse).copy(buffer, 7); // Pulse Rate
  
    buffer.writeUInt8(counter % 256, 9);   // User ID
    buffer.writeUInt16LE(0, 10);           // Measurement Status (e.g., body movement detected = 0)
  
    return buffer;
  }