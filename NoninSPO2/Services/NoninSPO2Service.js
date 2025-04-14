const bleno = require('@abandonware/bleno');                  
var util=require('util');

var NoninSPO2_NotifyCharacteristic=require('./characteristics/NoninSPO2/NoninSPO2_NotifyCharacteristic');

var NoninSPO2_WriteCharacteristic=require('./characteristics/NoninSPO2/NoninSPO2_WriteCharacteristic');


let rawdata4=require('/home/pi/Documents/RaspberryPi_Project/NoninSPO2/extra/Service_UUIDs.json');
var data4=JSON.stringify(rawdata4);
let test4=JSON.parse(data4);

function  NoninSPO2Service(){


	bleno.PrimaryService.call(this,{
		uuid:test4["NoninSPO2"].uuid,
		characteristics:[ new NoninSPO2_NotifyCharacteristic() ,
                                    new NoninSPO2_WriteCharacteristic() 
                               

		         ]
	  } );

};
util.inherits(NoninSPO2Service,bleno.PrimaryService);
module.exports=NoninSPO2Service;
