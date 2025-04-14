var bleno = require('@abandonware/bleno');
var NoninSPO2Service = require('./Services/NoninSPO2Service')
bleno.on('stateChange', function(state) {



  if (state === 'poweredOn') {
      
  bleno.startAdvertising("Nonin", [NoninSPO2Service.uuid]);
   
  }
  else {

    bleno.stopAdvertising();
  }
});
