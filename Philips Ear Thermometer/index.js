var bleno = require('@abandonware/bleno');


 
 

var HealthThermometerService=require('./Services/HealthThermometerService');

var healthThermometerService=new HealthThermometerService();


let rawdata1=require('./extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);



bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);


  if (state === 'poweredOn') {
      
 bleno.startAdvertising(test1[25].string, [healthThermometerService.uuid]);
   
  }
  else {

    bleno.stopAdvertising();
  }
});


bleno.on ('advertisingStop', function (error)
{
  console.log ( 'Advertising Stopped …');
});


bleno.on('advertisingStart', function(error) {

  console.log('on -> advertisingStart: ' +
    (error ? 'error ' + error : 'success')
  );

  if (!error) {

    bleno.setServices([
      systemInformationService,healthThermometerService,
    ]);
  }
});
