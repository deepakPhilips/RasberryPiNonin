const bleno = require('@abandonware/bleno');
const util = require('util');

const ManufacturerNameCharacteristic = require('./characteristics/SystemInformation/ManufacturerNameCharacteristic');
const ModelNumberCharacteristic = require('./characteristics/SystemInformation/ModelNumberCharacteristic');
const SerialNumberCharacteristic = require('./characteristics/SystemInformation/SerialNumberCharacteristic');

const rawdata4 = require('../../MIScale/extra/Service_UUIDs.json');
const test4 = JSON.parse(JSON.stringify(rawdata4));

class SystemInformationService extends bleno.PrimaryService {
  constructor() {
    super({
      uuid: test4["Sys"].uuid,
      characteristics: [
        new ManufacturerNameCharacteristic(),
        new SerialNumberCharacteristic(),
        new ModelNumberCharacteristic(),
      ],
    });
  }
}

module.exports = SystemInformationService;