function handleMeasurementSubscribe(options, deviceType, maxValueSize, updateValueCallback) {
    console.log('Device subscribed, sending measurement...');
  
    if (deviceType === 'Pulse Oximeter') {
      const { saturation, pulse } = options;
      if (saturation <= 0 || saturation > 100 || pulse <= 0 || pulse > 321) {
        console.error('Invalid measurement values');
        process.exit(2);
      }
      const buf = Buffer.from(processOximeterMeasurement(saturation, pulse));
      console.log('Sending oximeter measurement:', buf.toString('hex'));
      updateValueCallback(buf);
      setTimeout(() => process.exit(0), 300);
  
    } else if (deviceType === 'Thermometer') {
      const temp = options.temperature;
      const buffer = getTemperatureValue(temp);
      console.log('Sending temperature after delay:', buffer.toString('hex'));
      updateValueCallback(buffer);
      setTimeout(() => {
        console.log('✅ Temperature sent, exiting process');
        process.exit(0);
      }, 300);
  
    }  
    else if (deviceType === 'Weight Scale') {
        const weight = options.weight;
        const buffer = getWeightValue(weight);
        console.log('Sending weight:', buffer.toString('hex'));
        updateValueCallback(buffer);
        setTimeout(() => process.exit(0), 300);
    } 
    else if (deviceType === 'Blood Pressure Monitor') {
        const systolic = options.systolic || 120;
        const diastolic = options.diastolic || 80;
        const map = options.map || 90;
      
        const buffer = Buffer.alloc(7);
        buffer.writeUInt8(0x00, 0); // Flags
      
        encodeSfloat(systolic).copy(buffer, 1);  // systolic
        encodeSfloat(diastolic).copy(buffer, 3); // diastolic
        encodeSfloat(map).copy(buffer, 5);       // MAP
      
        console.log('Sending BP measurement:', buffer.toString('hex'));
        updateValueCallback(buffer);
        setTimeout(() => process.exit(0), 300);
      }   
    else {
        console.warn('Unsupported device type:', deviceType);
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
  
  function getHeartRateMeasurement(bpm) {
    const flags = 0x00; // 8-bit format
    const buffer = Buffer.alloc(2);
    buffer.writeUInt8(flags, 0);
    buffer.writeUInt8(bpm, 1);
    return buffer;
  }

  function getWeightValue(weightKg) {
    const flags = 0x00; // 0 = weight in kg
    const exponent = -2;
    const mantissa = Math.round(weightKg * 100); // scale to 0.01 kg
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(flags, 0);
    buffer.writeIntLE(mantissa, 1, 3);
    buffer.writeInt8(exponent, 4);
    return buffer;
}

function encodeSfloat(value) {
    const exponent = -2; // scale = 10^-2
    const mantissa = Math.round(value * 100); // scale up
  
    // Bound to 12-bit signed range
    const boundedMantissa = Math.max(-2048, Math.min(2047, mantissa));
    const sfloat = (exponent & 0x0F) << 12 | (boundedMantissa & 0x0FFF);
  
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(sfloat, 0);
    return buffer;
  }
  

  
  module.exports = {
    handleMeasurementSubscribe,
    handleMeasurementUnsubscribe,
    handRequestCallBack
  };
  