const bleno = require('@abandonware/bleno');
const { PrimaryService, Characteristic } = bleno;

function createChar(uuid, value) {
  return new Characteristic({
    uuid,
    properties: ['read'],
    onReadRequest: (_, callback) => callback(this.RESULT_SUCCESS, Buffer.from(value, 'utf-8'))
  });
}

module.exports = class DeviceInfoService extends bleno.PrimaryService {
  constructor() {
    super({
      uuid: '180A',
      characteristics: [
        createChar('2A29', 'A&D'),
        createChar('2A24', 'UA-651BLE'),
        createChar('2A25', '12345678'),
        createChar('2A27', '1.0'),
        createChar('2A26', '1.1'),
        createChar('2A28', '1.2'),
        createChar('2A23', '0102030405060708'),
        createChar('2A2A', 'certified')
      ]
    });
  }
};
