
const dbus = require('dbus-next');
const { Variant } = dbus;
const { Interface } = require('dbus-next').interface;
const { systemBus } = dbus;

class NoInputNoOutputAgent extends Interface {
    constructor() {
      super('org.bluez.Agent1');
    }
  
    RequestPinCode(msg, device) {
      console.log(`RequestPinCode: ${device}`);
      return '0000';
    }
  
    RequestPasskey(msg, device) {
      console.log(`RequestPasskey: ${device}`);
      return new Variant('u', 123456);
    }
  
    RequestConfirmation(msg, device, passkey) {
      console.log(`RequestConfirmation: ${passkey} for ${device}`);
    }
  
    AuthorizeService(msg, device, uuid) {
      console.log(`AuthorizeService for ${uuid}`);
    }
  
    Cancel(msg, device) {
      console.log(`Cancel for ${device}`);
    }
  
    Release(msg) {
      console.log('Agent released');
    }
  }
  
  NoInputNoOutputAgent.$methods = {
    RequestPinCode: ['o', 's', []],
    RequestPasskey: ['o', 'u', []],
    RequestConfirmation: ['ou', '', []],
    AuthorizeService: ['os', '', []],
    Cancel: ['o', '', []],
    Release: ['', '', []],
  };
  
  async function registerAgent() {
    const bus = systemBus();
    const agent = new NoInputNoOutputAgent();
    const AGENT_PATH = '/test/agent';
  
    bus.export(AGENT_PATH, agent);
  
    const bluez = await bus.getProxyObject('org.bluez', '/org/bluez');
    const agentManager = bluez.getInterface('org.bluez.AgentManager1');
  
    await agentManager.RegisterAgent(AGENT_PATH, 'NoInputNoOutput');
    await agentManager.RequestDefaultAgent(AGENT_PATH);
    console.log('✅ Pairing agent registered and set as default');
  }

  function set_mac() {
    try {
        console.log('🛠️ Running set_mac.sh to update Bluetooth MAC...');
        execSync('bash ./set_mac.sh', { stdio: 'inherit' });
      } catch (error) {
        console.error('❌ Failed to set MAC address:', error.message);
      }
  }
  module.exports = {
    registerAgent,
    set_mac
  };