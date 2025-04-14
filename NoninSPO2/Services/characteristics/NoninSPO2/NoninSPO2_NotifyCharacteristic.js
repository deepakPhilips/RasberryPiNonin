const bleno = require('@abandonware/bleno');
const Logger = require('../../../Logger.js');
const logger = new Logger();

const program = require('commander').program;

const rawdata1 = require('../../../extra/ConsoleLogComments.json');
const test1 = JSON.parse(JSON.stringify(rawdata1));

const rawdata3 = require('../../../extra/Characteristic_UUIDs.json');
const test3 = JSON.parse(JSON.stringify(rawdata3));

program
  .requiredOption('-s, --saturation <n>', 'saturation', parseInt)
  .requiredOption('-p, --pulse <n>', 'pulse', parseInt)
  .parse(process.argv);

const options = program.opts();

class NoninSPO2_NotifyCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: test3["NoninSPO2_Notify"].uuid,
      properties: ['indicate'],
      secure: ['indicate'],
    });

    this.counter = 0;
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    console.log('Device subscribed, sending measurement');
    this.intervalId = setInterval(() => {
      const measBuffer = this.processMeasurement();
      console.log('Sending measurement:', measBuffer);
      updateValueCallback(Buffer.from(measBuffer));
    }, 1000); // Send data every 1 second
  }

  onUnsubscribe() {
    logger.log(test1[2].string);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onIndicate() {
    logger.log(test1[3].string);
  }

  processMeasurement() {
    const pai = Math.floor(Math.random() * 6 + 1); // Random pulse amplitude index
    const pai2 = Math.floor(Math.random() * 100 + 1); // Random decimal places
    this.counter += 1; // Increment counter

    if (options.pulse > 256) {
      const pulse = '0' + options.pulse.toString(16);
      const pulse1 = parseInt(pulse.slice(0, 2), 16);
      const pulse2 = parseInt(pulse.slice(2, 4), 16);
      return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, this.counter, options.saturation, pulse1, pulse2];
    } else {
      return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, this.counter, options.saturation, 0x00, options.pulse];
    }
  }
}

module.exports = NoninSPO2_NotifyCharacteristic;