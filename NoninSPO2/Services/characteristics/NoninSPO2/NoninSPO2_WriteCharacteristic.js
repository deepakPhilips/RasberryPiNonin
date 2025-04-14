const bleno = require('@abandonware/bleno');
const Logger = require('../../../Logger.js');
const logger = new Logger();


const rawdata1 = require('../../../extra/ConsoleLogComments.json');
const test1 = JSON.parse(JSON.stringify(rawdata1));

const rawdata3 = require('../../../extra/Characteristic_UUIDs.json');
const test3 = JSON.parse(JSON.stringify(rawdata3));

// program
//   .requiredOption('-s, --write-saturation <n>', 'saturation', parseInt)
//   .requiredOption('-p, --write-pulse <n>', 'pulse', parseInt)
//   .parse(process.argv);


class NoninSPO2_WriteCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: test3["NoninSPO2_Write"].uuid,
      properties: ['indicate', 'write'],
      secure: ['indicate', 'write'],
    });

    this.control = null;
    this.writeflag = false;
    this.syncflag = false;
    this.intervalId = null;
    this.timeoutId = null;
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
    this.value = data; // An array of bytes
    const len = data.length;

    if (len === 2) {
      this.control = [data[0], data[1]];
    } else if (len === 4) {
      this.control = [data[0], data[1], data[2], data[3]];
    } else {
      this.control = [data[0], data[1], data[2], data[3], data[4]];
    }

    this.writeflag = true;
    console.log('Write request: value = ' + this.control + ', length = ' + len);
    callback(this.RESULT_SUCCESS);
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

  onSubscribe(maxValueSize, updateValueCallback) {
    console.log('Device subscribed to control');
    this.intervalId = setInterval(() => {
      if (this.writeflag) {
        if (this.control[0] === 97) { // Sync
          const time = this.control[1];
          if (this.syncflag) {
            updateValueCallback(Buffer.from([0xE1, 0x02]));
            console.log('E102, still syncing');
          } else if (time <= 25 && time >= 5 && !this.syncflag) { // In range
            updateValueCallback(Buffer.from([0xE1, 0x00]));
            console.log('E100, sync initialized');
            this.syncflag = true;
          } else { // Out of range
            updateValueCallback(Buffer.from([0xE1, 0x01]));
            console.log('E101, out of range value');
          }
        }
      }
    }, 1000);

    logger.log(test1[1].string);
    this._updateValueCallback = updateValueCallback;
  }
}

module.exports = NoninSPO2_WriteCharacteristic;