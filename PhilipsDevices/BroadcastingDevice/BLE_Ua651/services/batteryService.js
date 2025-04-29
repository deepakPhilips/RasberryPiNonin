const bleno = require('@abandonware/bleno');
const { PrimaryService, Characteristic } = bleno;

class BatteryLevel extends Characteristic {
  constructor() {
    super({
      uuid: '2A19',
      properties: ['read'],
    });
  }

  onReadRequest(_, callback) {
    const batteryLevel = Buffer.from([95]); // 95%
    callback(this.RESULT_SUCCESS, batteryLevel);
  }
}

module.exports = class BatteryService extends bleno.PrimaryService {
  constructor() {
    super({
      uuid: '180F',
      characteristics: [new BatteryLevel()]
    });
  }
};
