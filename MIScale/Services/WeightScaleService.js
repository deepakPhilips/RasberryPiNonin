var bleno=require('bleno');                  
var util=require('util');

var WeightScaleCharacteristic=require('./characteristics/WeightScale/WeightScaleCharacteristic');

let rawdata4=require('/home/pi/Documents/RaspberryPi_Project/MIScale/extra/Service_UUIDs.json');
var data4=JSON.stringify(rawdata4);
let test4=JSON.parse(data4);


function  WeightScaleService(){


	bleno.PrimaryService.call(this,{
		uuid: test4["WeightScale"].uuid,
		characteristics:[ new WeightScaleCharacteristic()

		         ]
	  } );

};
util.inherits(WeightScaleService,bleno.PrimaryService);
module.exports=WeightScaleService;