const dbus = require('dbus-next');
const { Interface, property, method, signal } = dbus.interface;
const { systemBus } = dbus;

class NoInputNoOutputAgent extends Interface {
  @method({ inSignature: 'o', outSignature: '' })
  RequestAuthorization(device) {
    console.log(`Authorization requested for ${device}`);
  }

  @method({ inSignature: 'o', outSignature: '' })
  AuthorizeService(device, uuid) {
    console.log(`AuthorizeService request for ${device} on ${uuid}`);
  }

  @method({ inSignature: 'o', outSignature: 'u' })
  RequestPasskey(device) {
    console.log(`RequestPasskey for ${device}`);
    return 123456;
  }

  @method({ inSignature: 'o', outSignature: 's' })
  RequestPinCode(device) {
    console.log(`RequestPinCode for ${device}`);
    return '0000';
  }

  @method({ inSignature: '', outSignature: '' })
  Release() {
    console.log('Agent released');
  }

  @method({ inSignature: 'o', outSignature: '' })
  Cancel(device) {
    console.log(`Cancel request for ${device}`);
  }
}

async function registerAgent() {
  const bus = systemBus();
  const bluez = await bus.getProxyObject('org.bluez', '/org/bluez');
  const agentManager = bluez.getInterface('org.bluez.AgentManager1');

  const agent = new NoInputNoOutputAgent('org.bluez.Agent1');
  await bus.requestName('org.bluez.PairingAgent');
  bus.export('/org/bluez/agent/node', agent);

  await agentManager.RegisterAgent('/org/bluez/agent/node', 'NoInputNoOutput');
  await agentManager.RequestDefaultAgent('/org/bluez/agent/node');

  console.log('✅ Pairing agent registered');
}

registerAgent().catch(err => {
  console.error('❌ Failed to register pairing agent:', err);
});
