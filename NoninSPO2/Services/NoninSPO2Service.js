const bleno = require('@abandonware/bleno');
const NoninSPO2_NotifyCharacteristic = require('./characteristics/NoninSPO2/NoninSPO2_NotifyCharacteristic');
const NoninSPO2_WriteCharacteristic = require('./characteristics/NoninSPO2/NoninSPO2_WriteCharacteristic');

const rawdata4 = require('./../extra/Service_UUIDs.json');
const test4 = JSON.parse(JSON.stringify(rawdata4));

class NoninSPO2Service extends bleno.PrimaryService {
  constructor() {
    super({
      uuid: test4["NoninSPO2"].uuid,
      characteristics: [
        new NoninSPO2_NotifyCharacteristic(),
        new NoninSPO2_WriteCharacteristic(),
      ],
    });
  }
}

module.exports = NoninSPO2Service;