const bleno = require('@abandonware/bleno');
const { PrimaryService, Characteristic, Descriptor } = bleno;

class BloodPressureMeasurement extends Characteristic {
  constructor() {
    super({
      uuid: '2a35',
      properties: ['indicate'],
      descriptors: [new Descriptor({ uuid: '2902', value: 'Blood Pressure Measurement' })]
    });
    this._updateValueCallback = null;
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    this._updateValueCallback = updateValueCallback;

    // Example static indication
    const buffer = Buffer.from([0x10, 120, 0, 80, 0, 90, 0, 0x60, 0x20, 0x05, 0x1D, 0x10, 0x20]); // Custom value
    updateValueCallback(buffer);
  }

  onUnsubscribe() {
    this._updateValueCallback = null;
  }
}

module.exports = class BloodPressureService extends PrimaryService {
  constructor() {
    super({
      uuid: '1810',
      characteristics: [new BloodPressureMeasurement()]
    });
  }
};
