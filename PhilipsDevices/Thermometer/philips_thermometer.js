var bleno = require('@abandonware/bleno');
var fs = require('fs');
var program = require('commander').program;

program
	.requiredOption('-t, --temperature <n>', 'temperature', parseInt)
	.parse(process.argv);

function logAndWriteFile(message, fileName, content) {
	console.log(message);
	fs.writeFileSync(fileName, content);
}

function handleStateChange(state) {
	console.log('GATT thermometer server running');
	console.log('Temperature value: %j', program.temperature);
	if (state === 'poweredOn') {
		logAndWriteFile('State powered on', 'outputOX.txt', '200');
		bleno.startAdvertising('Philips Thermometer', ['1809']);
	} else {
		bleno.stopAdvertising();
	}
}

function handleSubscription(intervalCallback, logMessage) {
	console.log(logMessage);
	this.intervalId = setInterval(intervalCallback, 1000);
}

function handleUnsubscription(logMessage) {
	console.log(logMessage);
	clearInterval(this.intervalId);
}

function createCharacteristic(uuid, properties, value, onSubscribe, onUnsubscribe, descriptors) {
	return new bleno.Characteristic({
		uuid,
		properties,
		value,
		onSubscribe,
		onUnsubscribe,
		descriptors
	});
}

function createPrimaryService(uuid, characteristics) {
	return new bleno.PrimaryService({
		uuid,
		characteristics
	});
}

bleno.on('stateChange', handleStateChange);

bleno.on('accept', function(clientAddress) {
	console.log('Connected to: ' + clientAddress);
});

bleno.on('disconnect', function() {
	console.log('Disconnected');
});

bleno.on('advertisingStart', function(error) {
	if (error) {
		console.log('Error: ' + error);
	} else {
		console.log('Started advertising');
		bleno.setServices([
			createPrimaryService('1801', [
				createCharacteristic('2A05', ['indicate'], new Buffer([0x00, 0x00]))
			]),
			createPrimaryService('1800', [
				createCharacteristic('2A00', ['read', 'write'], 'DL8740'),
				createCharacteristic('2A01', ['read', 'write'], new Buffer([0x03, 0x01])),
				createCharacteristic('2A02', ['read'], new Buffer([0x00])),
				createCharacteristic('2A03', ['read', 'write'], new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
				createCharacteristic('2A04', ['read', 'write'], new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
			]),
			createPrimaryService('1809', [
				createCharacteristic('2A1C', ['indicate'], null,
					function(maxValueSize, updateValueCallback) {
						handleSubscription.call(this, () => {
							console.log('Sending temperature measurement');
							let temperature = '0' + program.temperature.toString(16);
							let temperature1 = parseInt(temperature.slice(0, 2), 16);
							let temperature2 = parseInt(temperature.slice(2, 4), 16);
							let time = update_time();
							updateValueCallback([0x02, temperature2, temperature1, 0x00, 0xff, ...time]);
						}, 'Device subscribed to Measurement Service');
					},
					function() {
						handleUnsubscription.call(this, 'Unsubscribed from Measurement Service');
					}
				),
				createCharacteristic('2A1D', ['read'], new Buffer([0x09])),
				createCharacteristic('2A21', ['indicate', 'read', 'write'])
			]),
			createPrimaryService('180A', [
				createCharacteristic('2A29', ['read'], 'Philips'),
				createCharacteristic('2A24', ['read'], 'DL8740'),
				createCharacteristic('2A27', ['read'], '153803000090'),
				createCharacteristic('2A27', ['read'], '1.00'),
				createCharacteristic('2A26', ['read'], '1.00'),
				createCharacteristic('2A28', ['read'], '1.00'),
				createCharacteristic('2A23', ['read'], new Buffer([0xA0, 0x05, 0x00, 0xFE, 0xFF, 0x74, 0x87, 0x1C])),
				createCharacteristic('2A2A', ['read'], new Buffer([0x00, 0x02, 0x00, 0x12, 0x02, 0x01, 0x00, 0x08, 0x05, 0x01, 
					0x00, 0x01, 0x00, 0x02, 0x80, 0x08, 0x02, 0x02, 0x00, 0x02, 0x00, 0x00])),
				createCharacteristic('2A50', ['read'], new Buffer([0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01]))
			]),
			createPrimaryService('1805', [
				createCharacteristic('2A2B', ['notify', 'read', 'write'], new Buffer([0xDF, 0x07, 0x0C, 0x01, 0x09, 0x2b, 0x13, 0x00, 0x00, 0x00]),
					function(maxValueSize, updateValueCallback) {
						handleSubscription.call(this, () => {
							console.log('Sending time measurement');
							updateValueCallback(update_time());
						}, 'Device subscribed to Time Service');
					},
					function() {
						handleUnsubscription.call(this, 'Unsubscribed from Time Service');
					}
				)
			]),
			createPrimaryService('180F', [
				createCharacteristic('2A19', ['notify', 'read'], new Buffer([0x64]), 
					function(maxValueSize, updateValueCallback) {
						handleSubscription.call(this, () => {
							console.log('Sending battery measurement');
							updateValueCallback([0x64]);
						}, 'Device subscribed to Battery Service');
					},
					function() {
						handleUnsubscription.call(this, 'Unsubscribed from Battery Service');
					},
					[
						new bleno.Descriptor({
							uuid: '2904',
							value: new Buffer([0x04, 0x00, 0xAD, 0x27, 0x01, 0x00, 0x00])
						})
					]
				)
			])
		]);
	}
});

function update_time() {
	let time = new Date();
	let year = '0' + time.getFullYear().toString(16);
	let year1 = parseInt(year.slice(0, 2), 16);
	let year2 = parseInt(year.slice(2, 4), 16);
	let month = parseInt(('0' + (time.getMonth() + 1).toString(16)), 16);
	let day = parseInt(('0' + time.getDate().toString(16)), 16);
	let hours = parseInt(('0' + time.getHours().toString(16)), 16);
	let minutes = parseInt(('0' + time.getMinutes().toString(16)), 16);
	let seconds = parseInt(('0' + time.getSeconds().toString(16)), 16);
	return [year2, year1, month, day, hours, minutes, seconds, 0x00, 0x00, 0x00];
}
