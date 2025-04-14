const bleno = require('@abandonware/bleno');
const Logger = require('../../../Logger.js');
const logger = new Logger();

const rawdata = require('./TestData/BatteryTest.json');
const test = JSON.parse(JSON.stringify(rawdata));

const rawdata1 = require('../../../extra/ConsoleLogComments.json');
const test1 = JSON.parse(JSON.stringify(rawdata1));

const rawdata2 = require('../../../extra/Properties.json');
const test2 = JSON.parse(JSON.stringify(rawdata2));

const rawdata3 = require('../../../extra/Characteristic_UUIDs.json');
const test3 = JSON.parse(JSON.stringify(rawdata3));

class BatteryLevelCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: test3["BatteryLevel"].uuid,
      properties: ['read'],
    });

    this._value = Buffer.alloc(0); // Initialize with an empty buffer
  }

  onReadRequest(offset, callback) {
    const batteryPercentage = "23"; // Example battery percentage value

    if (!offset) {
      this._value = Buffer.from(batteryPercentage);
    }

    logger.log(
      test1[5].string +
      this._value.slice(offset, offset + bleno.mtu).toString()
    );

    callback(this.RESULT_SUCCESS, this._value.slice(offset, this._value.length));
  }
}

module.exports = BatteryLevelCharacteristic;