const bleno = require('@abandonware/bleno');
var os=require('os')
var util=require('util')
var program = require('commander').program;

program
	.requiredOption('-s, --saturation <n>', 'saturation', parseInt) 
	.requiredOption('-p, --pulse <n>', 'pulse', parseInt)
	.parse(process.argv);

const BlenoPrimaryService = bleno.PrimaryService;
const BlenoCharacteristic = bleno.Characteristic;

// UUID for the characteristic
const CHARACTERISTIC_UUID = '1447af800d6011e288b60002a5d5c51b';

// Define the Notify Characteristic
const OximeterNotifyCharacteristic = new BlenoCharacteristic({
  uuid: CHARACTERISTIC_UUID,
  properties: ['indicate'],
  secure: ['indicate'],
});

const OximeterWriteCharacteristic = new BlenoCharacteristic({
    uuid: CHARACTERISTIC_UUID,
    properties: ['indicate', 'write'],
    secure: ['indicate', 'write'],
  });

// Add the onSubscribe handler for the Notify Characteristic
OximeterNotifyCharacteristic.onSubscribe = function (maxValueSize, updateValueCallback) {
  console.log("Subscribed to notify characteristic");
  // Example: You can send data here using updateValueCallback
    // meas_buffer = process_meas(); //generate measurement buffer
    // console.log(meas_buffer);
	// updateValueCallback(meas_buffer);

  const data = Buffer.from([0x01, 0x02, 0x03]); // Example data
  updateValueCallback(data);
};

OximeterWriteCharacteristic.onWriteRequest = function (data, offset, withoutResponse, callback) {
    console.log('Write request received:', data.toString('hex'));
    
    // Example: Process the received data and send a response
    const receivedValue = data.toString('hex');
    console.log('Processing received value:', receivedValue);

    // Example: Send a response back to the Notify Characteristic
    const responseData = Buffer.from([0x04, 0x05, 0x06]); // Example response data
    OximeterNotifyCharacteristic.emit('data', responseData);

    callback(this.RESULT_SUCCESS);
};


// Define the Primary Service
const exampleService = new BlenoPrimaryService({
  uuid: '46a970e00d5f11e28b5e0002a5d5c51b',
  characteristics: [OximeterNotifyCharacteristic, OximeterWriteCharacteristic],
});

// Handle Bluetooth state changes
bleno.on('stateChange', (state) => {
  console.log(`Bluetooth state changed to: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising('NoninServcie', [exampleService.uuid]);
  } else {
    bleno.stopAdvertising();
  }
});

// Handle advertising start
bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('Started advertising...');
    bleno.setServices([exampleService]);
  } else {
    console.error('Failed to start advertising:', error);
  }
});


function process_meas() { //generates the measurement array
	var pai = Math.floor((Math.random() * 6) + 1); //random values for pulupdateValueCallbackse amplitude index
	var pai2 = Math.floor((Math.random() * 100) + 1); //and its decimal places
	counter = counter + 1; //increment counter
	if (program.pulse > 256) { //if larger than one byte
		pulse = '0' + program.pulse.toString(16);
		pulse1 = parseInt(pulse.slice(0, 2), 16);
		pulse2 = parseInt(pulse.slice(2, 4), 16); //convert to two hex bytes
		//measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, program.saturation, pulse1, pulse2];
measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, 25, 70, 70];
		}
	else {
		measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, 25, 0x00, 70];
		}
	
	return measurement; 
}
