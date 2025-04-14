var bleno=require('bleno')
var os=require('os')
var util=require('util')
var Logger=require('../../../Logger.js');
var logger=new Logger();

let rawdata=require('./TestData/BatteryTest.json');
var data=JSON.stringify(rawdata);
let test=JSON.parse(data);


let rawdata1=require('../../../extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);

let rawdata2=require('../../../extra/Properties.json');
var data2=JSON.stringify(rawdata2);
let test2=JSON.parse(data2);

let rawdata3=require('../../../extra/Characteristic_UUIDs.json');
var data3=JSON.stringify(rawdata3);
let test3=JSON.parse(data3);
var BlenoCharacteristic=bleno.Characteristic;

var BatteryLevelCharacteristic=function(){

BatteryLevelCharacteristic.super_.call(this,{
	 uuid:test3["BatteryLevel"].uuid,
	 properties:['read'],

     }

	)
this._value=new Buffer(0);
};

BatteryLevelCharacteristic.prototype.onReadRequest=function(offset,callback){
	
       // var batterypercentage=JSON.stringify(test[2].batteryPercentage);
          var batterypercentage="23";         
 
        if(!offset){
		this._value=new Buffer(batterypercentage);
	}
	logger.log(test1[5].string+
		this._value.slice(offset,offset+bleno.mtu).toString()
		);

    callback(this.RESULT_SUCCESS,this._value.slice(offset,this._value.length)) ;


    
};
util.inherits(BatteryLevelCharacteristic,BlenoCharacteristic);
module.exports=BatteryLevelCharacteristic;