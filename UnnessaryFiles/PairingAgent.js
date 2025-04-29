const dbus = require('dbus-next');
const { systemBus } = dbus;
const { Interface } = dbus.interface;

const bus = systemBus();

class NoInputNoOutputAgent extends Interface {
  constructor() {
    super('org.bluez.Agent1');
  }

  RequestPinCode(device) {
    console.log(`RequestPinCode for ${device}`);
    return Promise.resolve('0000');
  }

  RequestPasskey(device) {
    console.log(`RequestPasskey for ${device}`);
    return Promise.resolve(123456);
  }

  RequestConfirmation(device, passkey) {
    console.log(`RequestConfirmation: ${passkey}`);
    return Promise.resolve();
  }

  AuthorizeService(device, uuid) {
    console.log(`AuthorizeService: ${uuid}`);
    return Promise.resolve();
  }

  Cancel(device) {
    console.log(`Cancel for ${device}`);
  }

  Release() {
    console.log('Agent released');
  }
}

async function setupPairingAgent() {
  const bluez = await bus.getProxyObject('org.bluez', '/org/bluez');
  const agentMgr = bluez.getInterface('org.bluez.AgentManager1');

  const adapterObj = await bus.getProxyObject('org.bluez', '/org/bluez/hci0');
  const adapterProps = adapterObj.getInterface('org.freedesktop.DBus.Properties');

  await adapterProps.Set('org.bluez.Adapter1', 'Powered', new dbus.Variant('b', true));
  await adapterProps.Set('org.bluez.Adapter1', 'Discoverable', new dbus.Variant('b', true));
  await adapterProps.Set('org.bluez.Adapter1', 'Pairable', new dbus.Variant('b', true));
  await adapterProps.Set('org.bluez.Adapter1', 'Alias', new dbus.Variant('s', 'A&D_UC-352BLE_AA26F0'));

  const agent = new NoInputNoOutputAgent();
  await bus.export('/org/bluez/agent/node', agent);
  await agentMgr.RegisterAgent('/org/bluez/agent/node', 'NoInputNoOutput');
  await agentMgr.RequestDefaultAgent('/org/bluez/agent/node');

  console.log('✅ Pairing agent registered and adapter configured');
}

setupPairingAgent().catch(err => {
  console.error('❌ Failed to setup pairing agent:', err);
});
