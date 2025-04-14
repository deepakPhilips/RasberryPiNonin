const bleno = require('@abandonware/bleno');

const BlenoPrimaryService = bleno.PrimaryService;
const BlenoCharacteristic = bleno.Characteristic;

let notifyInterval = null;

const NotifyCharacteristic = new BlenoCharacteristic({
  uuid: 'ec0e',
  properties: ['notify'],

  onSubscribe: (maxValueSize, updateValueCallback) => {
    console.log('🔗 Central subscribed to characteristic');

    let counter = 0;

    // Start sending values every 2 seconds
    notifyInterval = setInterval(() => {
      const value = `Value: ${counter++}`;
      const buffer = Buffer.from(value);

      console.log('📤 Notifying:', value);
      updateValueCallback(buffer);
    }, 2000);
  },

  onUnsubscribe: () => {
    console.log('❌ Central unsubscribed');
    if (notifyInterval) {
      clearInterval(notifyInterval);
      notifyInterval = null;
    }
  }
});

const NotifyService = new BlenoPrimaryService({
  uuid: 'ec00',
  characteristics: [NotifyCharacteristic]
});

bleno.on('stateChange', (state) => {
  console.log(`🔄 Bluetooth state changed to: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising('NotifierDevice', [NotifyService.uuid]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('📣 Started advertising');
    bleno.setServices([NotifyService]);
  } else {
    console.error('⚠️ Advertising error:', error);
  }
});
