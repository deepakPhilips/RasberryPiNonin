var bleno = require('@abandonware/bleno');
var util = require('util');

var ManufacturerNameCharacteristic = require('./characteristics/SystemInformation/ManufacturerNameCharacteristic');
var ModelNumberCharacteristic = require('./characteristics/SystemInformation/ModelNumberCharacteristic');
var SerialNumberCharacteristic = require('./characteristics/SystemInformation/SerialNumberCharacteristic');

let rawdata4=require('/home/pi/Documents/RaspberryPi_Project/Philips Ear Thermometer/extra/Service_UUIDs.json');
var data4=JSON.stringify(rawdata4);
let test4=JSON.parse(data4);


function SystemInformationService() {

  bleno.PrimaryService.call(this, {
   uuid: test4["Sys"].uuid,
    characteristics: [
      new ManufacturerNameCharacteristic(),
      new SerialNumberCharacteristic(),
      new ModelNumberCharacteristic()
    ]
  });
};

util.inherits(SystemInformationService, bleno.PrimaryService);
module.exports = SystemInformationService;
