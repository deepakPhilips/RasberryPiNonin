const bleno = require('@abandonware/bleno');

const deviceInfoService  = ( props)=> new bleno.PrimaryService({
    uuid: '180A',
    characteristics: [
      new bleno.Characteristic({ uuid: '2A29', properties: ['read'], value: Buffer.from('Generic') }),
      new bleno.Characteristic({ uuid: '2A24', properties: ['read'], value: Buffer.from(props.type) }),
      new bleno.Characteristic({ uuid: '2A25', properties: ['read'], value: Buffer.from('123456789') }),
      new bleno.Characteristic({ uuid: '2A26', properties: ['read'], value: Buffer.from('1.0.0') }),
      new bleno.Characteristic({ uuid: '2A27', properties: ['read'], value: Buffer.from('1.0.0') }),
      new bleno.Characteristic({ uuid: '2A28', properties: ['read'], value: Buffer.from('1.0.0') }),
      new bleno.Characteristic({ uuid: '2A23', properties: ['read'], value: Buffer.from('aabbccddeeff0011', 'hex') }),
    ],
  });

  module.exports = {
    deviceInfoService
  }