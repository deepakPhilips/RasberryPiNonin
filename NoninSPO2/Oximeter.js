var bleno = require('@abandonware/bleno');
var fs = require('fs');
var program = require('commander').program;

var PrimaryService = bleno.PrimaryService;
var Characteristic = bleno.Characteristic;
var Descriptor = bleno.Descriptor;

var control, writeflag, syncflag = false, intervalId, timeoutId, timeout = 1, counter = 0;

program
	.requiredOption('-s, --saturation <n>', 'saturation', parseInt)
	.requiredOption('-p, --pulse <n>', 'pulse', parseInt)
	.parse(process.argv);

const options = program.opts();

bleno.on('stateChange', handleStateChange);
bleno.on('accept', handleAccept);
bleno.on('disconnect', handleDisconnect);
bleno.on('advertisingStart', handleAdvertisingStart);

function handleStateChange(state) {
	console.log('GATT oximeter server running');
	console.log('saturation value: %j, pulse value: %j', options.saturation, options.pulse);
	if (state === 'poweredOn') {
		bleno.startAdvertising('Nonin3230_501599389', ['46A970E0-0D5F-11E2-8B5E-0002A5D5C51B']);
		startTimeout();
	} else {
		bleno.stopAdvertising();
	}
}

function handleAccept(clientAddress) {
	timeout = 0;
	console.log('connected to: ' + clientAddress);
}

function handleDisconnect() {
	console.log("Disconnected");
	clearInterval(intervalId);
	process.exit(0);
}

function handleAdvertisingStart(error) {
	if (error) {
		console.error('Error starting advertising:', error);
		return;
	}

	console.log('Started advertising');
	bleno.setServices([
		createPrimaryService('180A', [
			createCharacteristic('2A29', ['read'], 'Nonin_Medical_Inc', 'Manufacturer Name'),
			createCharacteristic('2A24', ['read'], 'Model3230', 'Model'),
			createCharacteristic('2A25', ['read'], 'nonin_sim', 'Serial'),
			createCharacteristic('2A28', ['read'], 'r1.2 1.3', 'Software Revision'),
			createCharacteristic('2A26', ['read'], 'Software Revisions', 'Firmware Revision'),
		]),
		createPrimaryService('46A970E0-0D5F-11E2-8B5E-0002A5D5C51B', [
			createNotifyCharacteristic(
				'0AAD7EA0-0D60-11E2-8E3C-0002A5D5C51B',
				'Measurement',
				handleMeasurementSubscribe,
				handleMeasurementUnsubscribe
			),
		]),
	]);
}

function createPrimaryService(uuid, characteristics) {
	return new PrimaryService({ uuid, characteristics });
}

function createCharacteristic(uuid, properties, value, descriptorValue) {
	return new Characteristic({
		uuid,
		properties,
		value: Buffer.from(value),
		descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
	});
}

function createNotifyCharacteristic(uuid, descriptorValue, onSubscribe, onUnsubscribe) {
	return new Characteristic({
		uuid,
		properties: ['notify'],
		descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
		onSubscribe,
		onUnsubscribe,
	});
}

function createWriteNotifyCharacteristic(uuid, descriptorValue, onWriteRequest, onSubscribe, onUnsubscribe) {
	return new Characteristic({
		uuid,
		properties: ['write', 'notify'],
		descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
		onWriteRequest,
		onSubscribe,
		onUnsubscribe,
	});
}

function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
	counter = 0;
	timeout = 1;
	console.log('Device subscribed, sending measurement');
	if (isValidMeasurement(options.saturation, options.pulse)) {
		const measBuffer = processMeasurement();
		console.log(measBuffer);
		updateValueCallback(measBuffer);
		writeOutput('outputOX.txt', '200');
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
	control = Array.from(data);
	writeflag = true;
	console.log('Write request: value =', control, ', length =', data.length);
	callback(this.RESULT_SUCCESS);
}

function handleControlSubscribe(maxValueSize, updateValueCallback) {
	console.log('Device subscribed to control');
	intervalId = setTimeout(() => {
		if (writeflag) {
			handleControlSync(updateValueCallback);
		}
	}, 1000);
}

function handleControlUnsubscribe() {
	console.log('Control unsubscribed');
	clearInterval(intervalId);
}

function handleControlSync(updateValueCallback) {
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

function isValidMeasurement(saturation, pulse) {
	return saturation > 0 && saturation <= 100 && pulse > 0 && pulse < 322;
}

function processMeasurement() {
	const pai = Math.floor((Math.random() * 6) + 1);
	const pai2 = Math.floor((Math.random() * 100) + 1);
	counter++;
	if (options.pulse > 256) {
		const pulseHex = '0' + options.pulse.toString(16);
		const pulse1 = parseInt(pulseHex.slice(0, 2), 16);
		const pulse2 = parseInt(pulseHex.slice(2, 4), 16);
		return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, options.saturation, pulse1, pulse2];
	}
	return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, options.saturation, 0x00, options.pulse];
}

function writeOutput(filename, content) {
	fs.writeFileSync(filename, content);
}

function startTimeout() {
	time_counter = 1;
	timeoutId = setInterval(() => {
		time_counter++;
		if (timeout === 1 && time_counter === 60) {
			process.exit(1);
		}
	}, 1000);
}
