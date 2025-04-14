var bleno=require('bleno')
var os=require('os')
var util=require('util')

var program = require('commander');

var Descriptor = bleno.Descriptor
var control;
var writeflag;
var syncflag = false;
var intervalId;
var timeoutId;
var timeout = 1;


program
	.option('-s, --saturation <n>', 'saturation', parseInt) 
	.option('-p, --pulse <n>', 'pulse', parseInt)
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

var NoninSPO2_NotifyCharacteristic=function(){

NoninSPO2_NotifyCharacteristic.super_.call(this,{
	 uuid:test3["NoninSPO2_Notify"].uuid,
	 properties:['indicate'],
         secure:['indicate']
     }
	)

};



NoninSPO2_NotifyCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {

                                                                counter=0; 
								timeout = 1;
								console.log('Device subscribed, sending measurement');
							
									meas_buffer = process_meas(); //generate measurement buffer
									console.log(meas_buffer);
									updateValueCallback(meas_buffer); //sends
								};

NoninSPO2_NotifyCharacteristic.prototype.onUnsubscribe = function() {
  logger.log(test1[2].string);


  if (this.changeInterval) {
    clearInterval(this.changeInterval);
    this.changeInterval = null;
  }
};

NoninSPO2_NotifyCharacteristic.prototype.onIndicate= function() {
   logger.log(test1[3].string);

};




util.inherits(NoninSPO2_NotifyCharacteristic,BlenoCharacteristic);
module.exports=NoninSPO2_NotifyCharacteristic;



	
function process_meas() { //generates the measurement array
	var pai = Math.floor((Math.random() * 6) + 1); //random values for pulupdateValueCallbackse amplitude index
	var pai2 = Math.floor((Math.random() * 100) + 1); //and its decimal places
	counter = counter + 1; //increment counter
	if (program.pulse > 256) { //if larger than one byte
		pulse = '0' + program.pulse.toString(16);
		pulse1 = parseInt(pulse.slice(0, 2), 16);
		pulse2 = parseInt(pulse.slice(2, 4), 16); //convert to two hex bytes
		//measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, program.saturation, pulse1, pulse2];
measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, 25, 70, 70];
		}
	else {
		measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, 25, 0x00, 70];
		}
	
	return measurement; 
}


