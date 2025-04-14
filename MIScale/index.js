var bleno = require('bleno');
var readline=require('readline-sync');

var SystemInformationService = require('./Services/SystemInformationService');

var systemInformationService = new SystemInformationService();

var WeightScaleService=require('./Services/WeightScaleService');

var weightScaleService=new WeightScaleService();

var BatteryService=require('./Services/BatteryService');

var batteryService=new BatteryService();

var Logger=require('/home/pi/Documents/RaspberryPi_Project/Logger.js');
 
var logger=new Logger();

let rawdata1=require('/home/pi/Documents/RaspberryPi_Project/MIScale/extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);



bleno.on('stateChange', function(state) {
 logger.log('on -> stateChange: ' + state);


  if (state === 'poweredOn') {
      
   bleno.startAdvertising("MIs", [weightScaleService.uuid]);
   //bleno.startAdvertising("mi", [weightScaleService.uuid]);
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
      systemInformationService,weightScaleService,batteryService
    ]);
  }
});
