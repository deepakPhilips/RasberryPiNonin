const bleno = require('@abandonware/bleno');

const CHARACTERISTIC_UUID = '0aad7ea00d6011e28e3c0002a5d5c51b';

class NoninCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: CHARACTERISTIC_UUID,
      properties: ['notify'],
      value: null
    });

    this._updateValueCallback = null;
    this._interval = null;
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    console.log('[BLE] Client subscribed for PulseOx updates');
    this._updateValueCallback = updateValueCallback;

    this._interval = setInterval(() => {
      const spo2 = 97 + Math.floor(Math.random() * 3);  // 97–99%
      const pulse = 60 + Math.floor(Math.random() * 20); // 60–79 bpm

      // Simulated Nonin 3230 frame (very simplified example)
      const data = Buffer.from([
        0x01,       // flags
        spo2,       // SpO2
        pulse       // Pulse rate
      ]);

      console.log(`[BLE] Sending PulseOx: SpO2=${spo2}, Pulse=${pulse}`);
      if (this._updateValueCallback) {
        this._updateValueCallback(data);
      }
    }, 1000); // Update every 1s
  }

  onUnsubscribe() {
    console.log('[BLE] Client unsubscribed from PulseOx');
    clearInterval(this._interval);
    this._interval = null;
    this._updateValueCallback = null;
  }
}

module.exports = NoninCharacteristic;
