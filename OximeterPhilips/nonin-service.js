const bleno = require('@abandonware/bleno');
const NoninCharacteristic = require('./nonin-characteristic');

const SERVICE_UUID = '46A970E0-0D5F-11E2-8B5E-0002A5D5C51B';

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
