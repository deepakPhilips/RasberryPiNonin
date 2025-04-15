const bleno = require('@abandonware/bleno');
const NoninCharacteristic = require('./nonin-characteristic');

const SERVICE_UUID = '46a970e00d5f11e28b5e0002a5d5c51b';

class NoninService extends bleno.PrimaryService {
  constructor() {
    super({
      uuid: SERVICE_UUID,
      characteristics: [
        new NoninCharacteristic()
      ]
    });
  }
}

module.exports = NoninService;
