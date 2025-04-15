const bleno = require('@abandonware/bleno');

const CHARACTERISTIC_UUID = '0aad7ea00d6011e28e3c0002a5d5c51b';

class NoninCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: CHARACTERISTIC_UUID,
      properties: ['read', 'notify'],
      value: null
    });

    this._updateValueCallback = null;
  }

  onReadRequest(offset, callback) {
    console.log('[BLE] Read request received');

    const spo2 = 98;
    const pulse = 72;

    // Simulate a data frame — simplified
    const data = Buffer.from([
      0x01,   // Flags
      spo2,   // SpO2
      pulse   // Pulse Rate
    ]);

    callback(this.RESULT_SUCCESS, data);
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    console.log('[BLE] Client subscribed for notifications');
    this._updateValueCallback = updateValueCallback;

    this._interval = setInterval(() => {
      const spo2 = 97 + Math.floor(Math.random() * 3);
      const pulse = 60 + Math.floor(Math.random() * 20);

      const data = Buffer.from([0x01, spo2, pulse]);
      console.log(`[BLE] Notify: SpO2=${spo2}, Pulse=${pulse}`);
      if (this._updateValueCallback) {
        this._updateValueCallback(data);
      }
    }, 1000);
  }

  onUnsubscribe() {
    console.log('[BLE] Client unsubscribed');
    clearInterval(this._interval);
    this._interval = null;
    this._updateValueCallback = null;
  }
}

module.exports = NoninCharacteristic;
