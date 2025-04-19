function handleMeasurementSubscribe(options, deviceType, maxValueSize, updateValueCallback) {
  console.log('Device subscribed, sending measurement...');

  if (deviceType === 'Pulse Oximeter') {
    const { saturation, pulse } = options;
    if (saturation <= 0 || saturation > 100 || pulse <= 0 || pulse > 321) {
      console.error('Invalid measurement values');
      process.exit(2);
    }
    const buf = Buffer.from(processOximeterMeasurement(saturation, pulse));
    console.log('Sending measurement:', buf.toString('hex'));
    updateValueCallback(buf);
  } else {
    const temp = options.temperature;
    let count = 0;
    const interval = setInterval(() => {
      if (count >= 2) {
        clearInterval(interval);
        console.log('All temperature measurements sent');
        return;
      }
      const buffer = getTemperatureValue(temp + count);
      console.log('Sending:', buffer.toString('hex'));
      updateValueCallback(buffer);
      count++;
    }, 1500);
  }
}

function handleMeasurementUnsubscribe() {
  console.log('Measurement unsubscribed');
  process.exit(3);
}

function handRequestCallBack() {
    console.log('Measurement request received');
}

function processOximeterMeasurement(saturation, pulse) {
  const pai = Math.floor(Math.random() * 6 + 1);
  const pai2 = Math.floor(Math.random() * 100 + 1);
  const counter = 1;

  if (pulse > 256) {
    const pulseHex = ('0000' + pulse.toString(16)).slice(-4);
    const pulse1 = parseInt(pulseHex.slice(0, 2), 16);
    const pulse2 = parseInt(pulseHex.slice(2, 4), 16);
    return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, saturation, pulse1, pulse2];
  }
  return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, saturation, 0x00, pulse];
}

function getTemperatureValue(tempCelsius) {
  const flags = 0x00;
  const exponent = -2;
  const mantissa = Math.round(tempCelsius * 100);
  const buffer = Buffer.alloc(5);
  buffer.writeUInt8(flags, 0);
  buffer.writeIntLE(mantissa, 1, 3);
  buffer.writeInt8(exponent, 4);
  return buffer;
}

module.exports = {
  handleMeasurementSubscribe,
  handleMeasurementUnsubscribe,
  handRequestCallBack
};