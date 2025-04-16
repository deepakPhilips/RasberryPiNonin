var bleno = require('@abandonware/bleno');
var os = require('os');
var util = require('util');


var BlenoCharacteristic = bleno.Characteristic;

var Logger=require('/home/pi/Documents/RaspberryPi_Project/Logger.js');
var logger=new Logger();
let rawdata=require('./SystemInfoTestData/SystemInfoTest.json');
var data=JSON.stringify(rawdata);
let test=JSON.parse(data);

let rawdata1=require('/home/pi/Documents/RaspberryPi_Project/Philips Ear Thermometer/extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);

let rawdata2=require('/home/pi/Documents/RaspberryPi_Project/Philips Ear Thermometer/extra/Properties.json');
var data2=JSON.stringify(rawdata2);
let test2=JSON.parse(data2);

let rawdata3=require('/home/pi/Documents/RaspberryPi_Project/Philips Ear Thermometer/extra/Characteristic_UUIDs.json');
var data3=JSON.stringify(rawdata3);
let test3=JSON.parse(data3);

var SerialNumberCharacteristic = function() {
  SerialNumberCharacteristic.super_.call(this, {
     uuid:test3["Serial"].uuid,
    properties: ['read'],
  });

 this._value = new Buffer(0);
};

SerialNumberCharacteristic.prototype.onReadRequest = function(offset, callback) {

 
  if(!offset) {

    this._value = new Buffer(test1[18].string);
  }

     logger.log(test1[19].string+ 
		this._value.slice(offset,offset+bleno.mtu).toString()
    );

  callback(this.RESULT_SUCCESS, this._value.slice(offset, this._value.length));
};

util.inherits(SerialNumberCharacteristic, BlenoCharacteristic);
module.exports = SerialNumberCharacteristic;
