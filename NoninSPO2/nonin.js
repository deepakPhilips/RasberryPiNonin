var bleno = require('bleno');
bleno.on('stateChange', function(state) {
 logger.log('on -> stateChange: ' + state);


  if (state === 'poweredOn') {
      
  bleno.startAdvertising(test1[34].string, [NoninSPO2Service.uuid]);
   
  }
  else {

    bleno.stopAdvertising();
  }
});
