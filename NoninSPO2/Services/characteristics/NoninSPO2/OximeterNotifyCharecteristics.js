const bleno = require('@abandonware/bleno');
const util = require('util');
const { program } = require('commander');

const Descriptor = bleno.Descriptor;
const BlenoCharacteristic = bleno.Characteristic;

// Logger replacement
const logger = {
  log: console.log,
};

// Parse command-line arguments
program
  .requiredOption('--notify-saturation <n>', 'Saturation for notify characteristic', parseInt) // Renamed to avoid conflicts
  .requiredOption('--pulse <n>', 'Pulse for notify characteristic', parseInt)
  .parse(process.argv);

// Load JSON files
const test1 = require('../../../extra/ConsoleLogComments.json');
const test2 = require('../../../extra/Properties.json');
const test3 = require('../../../extra/Characteristic_UUIDs.json');

// Notify Characteristic Constructor
const OximeterNotifyCharecteristics = function () {
    OximeterNotifyCharecteristics.super_.call(this, {
    uuid: test3["NoninSPO2_Notify"].uuid,
    properties: ['indicate'],
    secure: ['indicate'],
  });
};

OximeterNotifyCharecteristics.prototype.onSubscribe = function (maxValueSize, updateValueCallback) {
  let counter = 0;
  console.log('Device subscribed, sending measurement');

  const meas_buffer = process_meas(); // Generate measurement buffer
  console.log(meas_buffer);
  updateValueCallback(meas_buffer); // Send measurement
};

OximeterNotifyCharecteristics.prototype.onUnsubscribe = function () {
  logger.log(test1[2].string);

  if (this.changeInterval) {
    clearInterval(this.changeInterval);
    this.changeInterval = null;
  }
};

OximeterNotifyCharecteristics.prototype.onIndicate = function () {
  logger.log(test1[3].string);
};

util.inherits(OximeterNotifyCharecteristics, BlenoCharacteristic);
module.exports = OximeterNotifyCharecteristics;

// Helper function to generate measurement array
function process_meas() {
  const pai = Math.floor(Math.random() * 6 + 1); // Random values for pulse amplitude index
  const pai2 = Math.floor(Math.random() * 100 + 1); // Random decimal places
  let counter = 0; // Increment counter

  let measurement;
  if (program.pulse > 256) {
    const pulse = '0' + program.pulse.toString(16);
    const pulse1 = parseInt(pulse.slice(0, 2), 16);
    const pulse2 = parseInt(pulse.slice(2, 4), 16); // Convert to two hex bytes
    measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, program.notifySaturation, pulse1, pulse2];
  } else {
    measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, program.notifySaturation, 0x00, program.pulse];
  }

  return measurement;
}