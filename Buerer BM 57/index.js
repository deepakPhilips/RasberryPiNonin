var bleno = require('bleno');
var readline=require('readline-sync');

var SystemInformationService = require('./Services/SystemInformationService');

var systemInformationService = new SystemInformationService();

 
var BatteryService=require('./Services/BatteryService');

var batteryService=new BatteryService();


var BloodPressureService=require('./Services/BloodPressureService');

var bloodPressureService=new BloodPressureService();


var Logger=require('/home/pi/Documents/RaspberryPi_Project/Logger.js');
 
var logger=new Logger();


let rawdata1=require('/home/pi/Documents/RaspberryPi_Project/Buerer BM 57/extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);



bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);


  if (state === 'poweredOn') {
      
 bleno.startAdvertising(test1[23].string, [bloodPressureService.uuid]);
   
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
      systemInformationService,bloodPressureService,batteryService
    ]);
  }
});
