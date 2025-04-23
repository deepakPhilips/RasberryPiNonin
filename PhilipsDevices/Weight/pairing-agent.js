const dbus = require('dbus-next');
const { Interface, DBusError, Variant } = dbus.interface;
const bus = dbus.systemBus();

class NoInputNoOutputAgent extends Interface {
  constructor() {
    super('org.bluez.Agent1');
  }

  RequestPinCode(device) {
    console.log(`🔐 RequestPinCode for ${device}`);
    return '0000';
  }

  RequestPasskey(device) {
    console.log(`🔐 RequestPasskey for ${device}`);
    return 123456;
  }

  DisplayPasskey(device, passkey, entered) {
    console.log(`💡 DisplayPasskey: ${passkey} for ${device}`);
  }

  RequestConfirmation(device, passkey) {
    console.log(`🔐 RequestConfirmation for ${device}: ${passkey}`);
    return;
  }

  AuthorizeService(device, uuid) {
    console.log(`✅ AuthorizeService for ${device}, UUID: ${uuid}`);
    return;
  }

  Cancel(device) {
    console.log(`❌ Cancel pairing with ${device}`);
    return;
  }

  Release() {
    console.log('🧹 Release agent');
  }
}

async function registerAgent() {
  const bluez = await bus.getProxyObject('org.bluez', '/org/bluez');
  const agentManager = bluez.getInterface('org.bluez.AgentManager1');

  const agent = new NoInputNoOutputAgent();
  await bus.export('/org/bluez/agent/node', agent);

  await agentManager.RegisterAgent('/org/bluez/agent/node', 'NoInputNoOutput');
  await agentManager.RequestDefaultAgent('/org/bluez/agent/node');

  console.log('✅ Pairing agent registered and default');
}

registerAgent().catch(err => {
  console.error('❌ Failed to register pairing agent:', err);
});
