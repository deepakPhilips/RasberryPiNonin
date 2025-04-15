const bleno = require('@abandonware/bleno');

const CHARACTERISTIC_UUID = '0aad7ea00d6011e28e3c0002a5d5c51b';

class PulseOxCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: CHARACTERISTIC_UUID,
      properties: ['notify'],
      value: null
    });

    this._updateValueCallback = null;
    this._timer = null;
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    console.log('Client subscribed to PulseOx');
    this._updateValueCallback = updateValueCallback;

    this._timer = setInterval(() => {
      const spo2 = 98; // Simulated SpO2
      const pulse = 72; // Simulated pulse rate

      // Format the data buffer based on expected Nonin 3230 format
      const buffer = Buffer.from([0x01, spo2, pulse]); // Simplified, not real protocol
      console.log(`Sending data: SpO2=${spo2}, Pulse=${pulse}`);
      updateValueCallback(buffer);
    }, 1000);
  }

  onUnsubscribe() {
    console.log('Client unsubscribed from PulseOx');
    this._updateValueCallback = null;
    clearInterval(this._timer);
    this._timer = null;
  }
}

module.exports = PulseOxCharacteristic;
