const bleno = require('@abandonware/bleno');

const BlenoPrimaryService = bleno.PrimaryService;
const BlenoCharacteristic = bleno.Characteristic;

let updateInterval = null;

const NotifyCharacteristic = new BlenoCharacteristic({
  uuid: 'ec0e',
  properties: ['notify'],
  
  onSubscribe: function(maxValueSize, updateValueCallback) {
    console.log('Central subscribed to notify characteristic');

    let counter = 0;
    updateInterval = setInterval(() => {
      const message = Buffer.from(`Value: ${counter++}`);
      console.log('Sending:', message.toString());
      updateValueCallback(message);
    }, 2000);
  },

  onUnsubscribe: function() {
    console.log('Central unsubscribed');
    clearInterval(updateInterval);
    updateInterval = null;
  }
});

const NotifyService = new BlenoPrimaryService({
  uuid: 'ec00',
  characteristics: [NotifyCharacteristic]
});

bleno.on('stateChange', (state) => {
  console.log(`Bluetooth state changed: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising('Notifier', [NotifyService.uuid]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (err) => {
  if (!err) {
    console.log('Advertising started...');
    bleno.setServices([NotifyService]);
  } else {
    console.error('Advertising error:', err);
  }
});
