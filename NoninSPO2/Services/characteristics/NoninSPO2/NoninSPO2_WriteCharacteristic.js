var bleno = require('@abandonware/bleno');
var os=require('os')
var util=require('util')

var fs = require('fs');
var program = require('commander').program;

var PrimaryService = bleno.PrimaryService;
var Characteristic = bleno.Characteristic;
var Descriptor = bleno.Descriptor
var control;
var writeflag;
var syncflag = false;
var intervalId;
var timeoutId;
var timeout = 1;

program
	.requiredOption('-s, --write-saturation <n>', 'saturation', parseInt) 
	.requiredOption('-p, --write-pulse <n>', 'pulse', parseInt)
	.parse(process.argv);

var BlenoCharacteristic=bleno.Characteristic;
var Logger=require('../../../Logger.js');
var logger=new Logger();



let rawdata1=require('../../../extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);

let rawdata2=require('../../../extra/Properties.json');
var data2=JSON.stringify(rawdata2);
let test2=JSON.parse(data2);

let rawdata3=require('../../../extra/Characteristic_UUIDs.json');
var data3=JSON.stringify(rawdata3);
let test3=JSON.parse(data3);

var NoninSPO2_WriteCharacteristic=function(){

NoninSPO2_WriteCharacteristic.super_.call(this,{
	 uuid:test3["NoninSPO2_Notify"].uuid,
	 properties:['indicate','write'],
         secure:['indicate','write']
     }
	)

};



NoninSPO2_WriteCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {

                                                             this.value = data; //an array of bytes
								len = data.length;
								if (len === 2) { //sort for length
									control = [data[0], data[1]];
									}
								else if (len === 4) { 
									control = [data[0], data[1], data[2], data[3]];
									}
								else {
									control = [data[0], data[1], data[2], data[3], data[4]];
								}
								writeflag = true;
								console.log('Write request: value = ' + control + ', length = ' + len);
								callback(this.RESULT_SUCCESS);
};

NoninSPO2_WriteCharacteristic.prototype.onUnsubscribe = function() {
  logger.log(test1[2].string);


  if (this.changeInterval) {
    clearInterval(this.changeInterval);
    this.changeInterval = null;
  }
};

NoninSPO2_WriteCharacteristic.prototype.onIndicate= function() {
   logger.log(test1[3].string);

};



NoninSPO2_WriteCharacteristic.prototype.onSubscribe =function(maxValueSize, updateValueCallback) { //send response to control!
								console.log('Device subscribed to control'); //use flag
								hex_buffer = [];
								intervalId = setTimeout(function() { 
									if (writeflag === true) { //if client has written
										if (control[0] === 97) { //sync
											time = control[1];
											if (syncflag === true) { //still syncing
												updateValueCallback([0xE1, 0x02]);
												console.log('E102, still syncing');
												}
											else if (time <= 25 || time >= 5 && syncflag === false){ //in range
												updateValueCallback([0xE1, 0x00]);
												console.log('E100, sync initialised');
												syncflag = true; 
												}
											else { //out of range
												updateValueCallback([0xE1, 0x01]);
												console.log('E101, out of range value');
												}
											}
									}
								}, 1000);

logger.log(test1[1].string);

  this._updateValueCallback = updateValueCallback;
};

util.inherits(NoninSPO2_WriteCharacteristic,BlenoCharacteristic);
module.exports=NoninSPO2_WriteCharacteristic;



	
function process_meas() { //generates the measurement array
	var pai = Math.floor((Math.random() * 6) + 1); //random values for pulupdateValueCallbackse amplitude index
	var pai2 = Math.floor((Math.random() * 100) + 1); //and its decimal places
	counter = counter + 1; //increment counter
	if (program.pulse > 256) { //if larger than one byte
		pulse = '0' + program.pulse.toString(16);
		pulse1 = parseInt(pulse.slice(0, 2), 16);
		pulse2 = parseInt(pulse.slice(2, 4), 16); //convert to two hex bytes
		measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, program.saturation, pulse1, pulse2];
		}
	else {
		measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, program.saturation, 0x00, program.pulse];
		}
	
	return measurement; 
}


