const bleno = require('@abandonware/bleno');
const util = require('util');
const program = require('commander').program;

program
  .requiredOption('-s, --saturation <n>', 'Saturation level', parseInt)
  .requiredOption('-p, --pulse <n>', 'Pulse rate', parseInt)
  .parse(process.argv);

const BlenoPrimaryService = bleno.PrimaryService;
const BlenoCharacteristic = bleno.Characteristic;

// UUIDs for the characteristics
const CHARACTERISTIC_UUID_NOTIFY = '1447af800d6011e288b60002a5d5c51b';
const CHARACTERISTIC_UUID_WRITE = '1447af810d6011e288b60002a5d5c51b';

// Define the Notify Characteristic
const OximeterNotifyCharacteristic = new BlenoCharacteristic({
  uuid: CHARACTERISTIC_UUID_NOTIFY,
  properties: ['indicate'],
  secure: ['indicate'],
});

let notifyInterval = null;

// Add the onSubscribe handler for the Notify Characteristic
OximeterNotifyCharacteristic.onSubscribe = function (maxValueSize, updateValueCallback) {
  console.log("Device subscribed to notify characteristic");

  // Start sending measurement data periodically
  notifyInterval = setInterval(() => {
    const measBuffer = process_meas(); // Generate measurement buffer
    console.log('Sending measurement:', measBuffer);
    updateValueCallback(Buffer.from(measBuffer)); // Send data to the subscribed device
  }, 1000); // Send data every 1 second
};

// Add the onUnsubscribe handler for the Notify Characteristic
OximeterNotifyCharacteristic.onUnsubscribe = function () {
  console.log("Device unsubscribed from notify characteristic");

  // Stop sending data when the device unsubscribes
  if (notifyInterval) {
    clearInterval(notifyInterval);
    notifyInterval = null;
  }
};

// Define the Write Characteristic
const OximeterWriteCharacteristic = new BlenoCharacteristic({
  uuid: CHARACTERISTIC_UUID_WRITE,
  properties: ['write'],
  secure: ['write'],
});

// Add the onWriteRequest handler for the Write Characteristic
OximeterWriteCharacteristic.onWriteRequest = function (data, offset, withoutResponse, callback) {
  console.log('Write request received:', data.toString('hex'));

  // Example: Process the received data
  const receivedValue = data.toString('hex');
  console.log('Processing received value:', receivedValue);

  // Example: Respond to the write request
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
    bleno.startAdvertising('NoninService', ['180A', '46a970e00d5f11e28b5e0002a5d5c51b']);
  } else {
    bleno.stopAdvertising();
  }
});

// // Handle advertising start
// bleno.on('advertisingStart', (error) => {
//   if (!error) {
//     console.log('Started advertising...');
//     bleno.setServices([exampleService]);
//   } else {
//     console.error('Failed to start advertising:', error);
//   }
// });

// Function to generate the measurement array
function process_meas() {
  const pai = Math.floor(Math.random() * 6 + 1); // Random pulse amplitude index
  const pai2 = Math.floor(Math.random() * 100 + 1); // Random decimal places
  const counter = Math.floor(Math.random() * 256); // Random counter value

  let measurement;
  if (program.pulse > 256) {
    const pulse = '0' + program.pulse.toString(16);
    const pulse1 = parseInt(pulse.slice(0, 2), 16);
    const pulse2 = parseInt(pulse.slice(2, 4), 16); // Convert to two hex bytes
    measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, program.saturation, pulse1, pulse2];
  } else {
    measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, program.saturation, 0x00, program.pulse];
  }

  return measurement;
}



bleno.on('advertisingStart', function(error) {
	if (error) {
		console.error('Error starting advertising:', error);
		return;
	}

	console.log('Started advertising');
	bleno.setServices([
		new bleno.PrimaryService({
			uuid: '180A',
			characteristics: [
				createCharacteristic('2A29', ['read'], 'Nonin_Medical_Inc', 'Manufacturer Name'),
				createCharacteristic('2A24', ['read'], 'Model3230', 'Model'),
				createCharacteristic('2A25', ['read'], 'nonin_sim', 'Serial'),
				createCharacteristic('2A28', ['read'], 'r1.2 1.3', 'Software Revision'),
				createCharacteristic('2A26', ['read'], 'Software Revisions', 'Firmware Revision'),
			],
		}),
		new bleno.PrimaryService({
			uuid: '46a970e00d5f11e28b5e0002a5d5c51b',
			characteristics: [
				createNotifyCharacteristic(
					'0aad7ea00d6011e28e3c0002a5d5c51b',
					'Measurement',
					handleMeasurementSubscribe,
					handleMeasurementUnsubscribe
				),
				createWriteNotifyCharacteristic(
					'1447af800d6011e288b60002a5d5c51b',
					'Control Point',
					handleControlWrite,
					handleControlSubscribe,
					handleControlUnsubscribe
				),
			],
		}),
	]);
});

function createCharacteristic(uuid, properties, value, descriptorValue) {
	return new bleno.Characteristic({
		uuid,
		properties,
		value: Buffer.from(value),
		descriptors: [
			new bleno.Descriptor({
				uuid: '2901',
				value: descriptorValue,
			}),
		],
	});
}

function createNotifyCharacteristic(uuid, descriptorValue, onSubscribe, onUnsubscribe) {
	return new bleno.Characteristic({
		uuid,
		properties: ['notify'],
		descriptors: [
			new bleno.Descriptor({
				uuid: '2901',
				value: descriptorValue,
			}),
		],
		onSubscribe,
		onUnsubscribe,
	});
}

function createWriteNotifyCharacteristic(uuid, descriptorValue, onWriteRequest, onSubscribe, onUnsubscribe) {
	return new bleno.Characteristic({
		uuid,
		properties: ['write', 'notify'],
		descriptors: [
			new bleno.Descriptor({
				uuid: '2901',
				value: descriptorValue,
			}),
		],
		onWriteRequest,
		onSubscribe,
		onUnsubscribe,
	});
}

function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
	counter = 0;
	timeout = 1;
	console.log('Device subscribed, sending measurement');
	if (options.saturation <= 100 && options.saturation > 0 && options.pulse > 0 && options.pulse < 322) {
		const measBuffer = process_meas();
		console.log(measBuffer);
		updateValueCallback(measBuffer);
		write_ox();
	} else {
		process.exit(2);
	}
}

function handleMeasurementUnsubscribe() {
	console.log('Measurement unsubscribed');
	clearInterval(intervalId);
	process.exit(3);
}

function handleControlWrite(data, offset, withoutResponse, callback) {
	this.value = data;
	const len = data.length;
	control = Array.from(data.slice(0, len));
	writeflag = true;
	console.log('Write request: value =', control, ', length =', len);
	callback(this.RESULT_SUCCESS);
}

function handleControlSubscribe(maxValueSize, updateValueCallback) {
	console.log('Device subscribed to control');
	intervalId = setTimeout(() => {
		if (writeflag) {
			if (control[0] === 97) {
				const time = control[1];
				if (syncflag) {
					updateValueCallback([0xE1, 0x02]);
					console.log('E102, still syncing');
				} else if (time <= 25 && time >= 5) {
					updateValueCallback([0xE1, 0x00]);
					console.log('E100, sync initialized');
					syncflag = true;
				} else {
					updateValueCallback([0xE1, 0x01]);
					console.log('E101, out of range value');
				}
			}
		}
	}, 1000);
}

function handleControlUnsubscribe() {
	console.log('Control unsubscribed');
	clearInterval(intervalId);
}