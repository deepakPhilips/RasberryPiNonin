const bleno = require('@abandonware/bleno');
const PrimaryService = bleno.PrimaryService;
const Characteristic = bleno.Characteristic;

const manufacturerName = new Characteristic({
  uuid: '2A29',
  properties: ['read'],
  value: Buffer.from('Pyle Health')
});

const modelNumber = new Characteristic({
  uuid: '2A24',
  properties: ['read'],
  value: Buffer.from('PHBPB20')
});

const deviceInfoService = new PrimaryService({
  uuid: '180A',
  characteristics: [manufacturerName, modelNumber]
});

module.exports = deviceInfoService;
