const bleno = require('@abandonware/bleno');                  
var util=require('util');

var NoninSPO2_NotifyCharacteristic=require('./characteristics/NoninSPO2/NoninSPO2_NotifyCharacteristic');

// var NoninSPO2_WriteCharacteristic=require('./characteristics/NoninSPO2/NoninSPO2_WriteCharacteristic');


let rawdata4=require('../extra/Service_UUIDs.json');
var data4=JSON.stringify(rawdata4);
let test4=JSON.parse(data4);

function  NoninSPO2Service(){


	bleno.PrimaryService.call(this,{
		uuid:"46a970e00d5f11e28b5e0002a5d5c51b",
		characteristics:[ new NoninSPO2_NotifyCharacteristic()]
	  } );

};
util.inherits(NoninSPO2Service,bleno.PrimaryService);
module.exports=NoninSPO2Service;
