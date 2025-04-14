var bleno=require('bleno');                  
var util=require('util');

var GlucoseMeasurementCharacteristic=require('./characteristics/GlucoseMeasurement/GlucoseMeasurementCharacteristic');
var GlucoseMeasurementCharacteristic1=require('./characteristics/GlucoseMeasurement/GlucoseMeasurementCharacteristic1');


let rawdata4=require('/home/pi/Documents/RaspberryPi_Project/Contour GL/extra/Service_UUIDs.json');
var data4=JSON.stringify(rawdata4);
let test4=JSON.parse(data4);


function  GlucoseMeasurementService(){


	bleno.PrimaryService.call(this,{
		uuid:test4["GlucoseMeasurement"].uuid,
		characteristics:[ new GlucoseMeasurementCharacteristic(),new GlucoseMeasurementCharacteristic1()

		         ]
	  } );

};
util.inherits(GlucoseMeasurementService,bleno.PrimaryService);
module.exports=GlucoseMeasurementService;