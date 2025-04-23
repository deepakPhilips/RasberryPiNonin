class NoInputNoOutputAgent extends Interface {
    constructor() {
      super('org.bluez.Agent1');
    }
  
    RequestPinCode(device) {
      console.log(`🔐 RequestPinCode for ${device}`);
      return Promise.resolve('0000');
    }
  
    RequestPasskey(device) {
      console.log(`🔐 RequestPasskey for ${device}`);
      return Promise.resolve(123456);
    }
  
    DisplayPasskey(device, passkey, entered) {
      console.log(`💡 DisplayPasskey: ${passkey} for ${device}`);
    }
  
    RequestConfirmation(device, passkey) {
      console.log(`🔐 RequestConfirmation for ${device}: ${passkey}`);
      return Promise.resolve(); // ⬅️ Fix: must confirm explicitly
    }
  
    AuthorizeService(device, uuid) {
      console.log(`✅ AuthorizeService for ${device}, UUID: ${uuid}`);
      return Promise.resolve(); // ⬅️ Fix: must authorize explicitly
    }
  
    Cancel(device) {
      console.log(`❌ Cancel pairing with ${device}`);
    }
  
    Release() {
      console.log('🧹 Release agent');
    }
  }
  