const bleno = require('@abandonware/bleno');
const { PrimaryService, Characteristic } = bleno;

class CustomRWCharacteristic extends Characteristic {
  constructor() {
    super({
      uuid: '233bf001-5a34-1b6d-975c-000d5690abe4',
      properties: ['read', 'write'],
    });
    this.value = Buffer.from('default');
  }

  onReadRequest(_, callback) {
    callback(this.RESULT_SUCCESS, this.value);
  }

  onWriteRequest(data, _, withoutResponse, callback) {
    this.value = data;
    callback(this.RESULT_SUCCESS);
  }
}

module.exports = class CustomService extends PrimaryService {
  constructor() {
    super({
      uuid: '233bf000-5a34-1b6d-975c-000d5690abe4',
      characteristics: [new CustomRWCharacteristic()]
    });
  }
};
