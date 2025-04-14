const bleno = require('@abandonware/bleno');
const BatteryCharacteristic = require('./characteristics/BatteryLevel/BatteryLevelCharacteristic');

const rawdata4 = require('../extra/Service_UUIDs.json');
const test4 = JSON.parse(JSON.stringify(rawdata4));

class BatteryService extends bleno.PrimaryService {
  constructor() {
    super({
      uuid: test4["Battery"].uuid,
      characteristics: [new BatteryCharacteristic()],
    });
  }
}

module.exports = BatteryService;