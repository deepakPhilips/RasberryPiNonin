var bleno = require('@abandonware/bleno');                  
var util=require('util');

var HealthThermometerCharacteristic=require('./characteristics/HealthThermometer/HealthThermometerCharacteristic');

let rawdata4=require('../extra/Service_UUIDs.json');
var data4=JSON.stringify(rawdata4);
let test4=JSON.parse(data4);



function  HealthThermometerService(){


	bleno.PrimaryService.call(this,{
		uuid: test4["HealthThermometer"].uuid,
		characteristics:[ new  HealthThermometerCharacteristic()

		         ]
	  } );

};
util.inherits( HealthThermometerService,bleno.PrimaryService);
module.exports= HealthThermometerService;