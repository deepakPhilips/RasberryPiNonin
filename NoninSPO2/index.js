var bleno = require('@abandonware/bleno');

var SystemInformationService = require('./Services/SystemInformationService');

var systemInformationService = new SystemInformationService();

var NoninSPO2Service=require('./Services/NoninSPO2Service');

var NoninSPO2Service=new NoninSPO2Service();

var BatteryService=require('./Services/BatteryService');

var batteryService=new BatteryService();

var Logger=require('./Logger.js');
 
var logger=new Logger();

let rawdata1=require('./extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);



bleno.on('stateChange', function(state) {
 logger.log('on -> stateChange: ' + state);


  if (state === 'poweredOn') {
      
  bleno.startAdvertising(test1[34].string, [NoninSPO2Service.uuid]);
   
  }
  else {

    bleno.stopAdvertising();
  }
});


bleno.on ('advertisingStop', function (error)
{
    logger.log ( 'Advertising Stopped …');
});


bleno.on('advertisingStart', function(error) {

 logger.log('on -> advertisingStart: ' +
    (error ? 'error ' + error : 'success')
  );

  if (!error) {

    bleno.setServices([
      NoninSPO2Service
    ]);
  }
});
