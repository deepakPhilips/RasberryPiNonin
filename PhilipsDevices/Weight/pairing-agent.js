const dbus = require('dbus-next');
const { Variant } = dbus;
const BLUEZ_SERVICE_NAME = 'org.bluez';
const AGENT_PATH = '/org/bluez/agent/node';
const AGENT_INTERFACE = 'org.bluez.Agent1';

async function registerAgent() {
  const bus = dbus.systemBus();
  const bluez = await bus.getProxyObject(BLUEZ_SERVICE_NAME, '/org/bluez');
  const agentManager = bluez.getInterface('org.bluez.AgentManager1');

  const agent = {
    [AGENT_INTERFACE]: {
      RequestPinCode: () => { throw new Error('Not implemented'); },
      RequestPasskey: () => { throw new Error('Not implemented'); },
      DisplayPasskey: () => {},
      DisplayPinCode: () => {},
      RequestConfirmation: () => {},
      AuthorizeService: () => {},
      Cancel: () => {},
      Release: () => {},
    }
  };

  await bus.export(AGENT_PATH, agent);

  await agentManager.RegisterAgent(AGENT_PATH, 'NoInputNoOutput');
  await agentManager.RequestDefaultAgent(AGENT_PATH);

  console.log('✅ Pairing agent registered');
}

registerAgent().catch(err => {
  console.error('❌ Failed to register pairing agent:', err);
});
