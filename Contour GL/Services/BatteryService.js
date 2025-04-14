var bleno=require('bleno');                  
var util=require('util');

var BatteryCharacteristic=require('./characteristics/BatteryLevel/BatteryLevelCharacteristic');


let rawdata4=require('/home/pi/Documents/RaspberryPi_Project/Contour GL/extra/Service_UUIDs.json');
var data4=JSON.stringify(rawdata4);
let test4=JSON.parse(data4);


function  BatteryService(){


	bleno.PrimaryService.call(this,{
		uuid:test4["Battery"].uuid,
		characteristics:[ new BatteryCharacteristic()

		         ]
	  } );

};
util.inherits(BatteryService,bleno.PrimaryService);
module.exports=BatteryService;