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
        console.log('✅ Validic subscribed — sending weight');
        

        const buffer = encodeMeasurement(options.weight);
    
        if (typeof updateValueCallback === 'function') {
          updateValueCallback(buffer);
          console.log(`📤 Sent dynamic weight: ${options.weight.toFixed(1)} kg`);
          setTimeout(() => {
            disconnectFromCentral();
          }, 1000);
        } else {
          console.warn('⚠️ No subscriber to send weight to');
        }


        // setTimeout(() => {
        //     const buffer = Buffer.from('021a03e90704170d3a1e', 'hex'); // 79.4kg
        //     if (typeof updateValueCallback === 'function') {
        //       updateValueCallback(buffer);
        //       console.log('📤 Measurement sent');
        //     } else {
        //       console.warn('⚠️ No subscriber to send weight to');
        //     }
        //   }, 2000) // small delay to mimic real-world behavior
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
  

  function sfloatFromNumber(value) {
    let exponent = 0;
    let mantissa = Math.round(value * 10); // scale for 1 decimal
  
    while (mantissa > 2047) {
      mantissa = Math.round(mantissa / 10);
      exponent++;
    }
  
    if (mantissa < 0) {
      mantissa = (1 << 12) + mantissa;
    }
  
    const sfloat = (exponent << 12) | (mantissa & 0x0FFF);
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(sfloat, 0);
    return buffer;
  }
  
  module.exports = {
    handleMeasurementSubscribe,
    handleMeasurementUnsubscribe,
    handRequestCallBack
  };
  

  function encodeMeasurement(weightKg) {
      const flags = 0x02;
      const weightHg = Math.round(weightKg * 10); // kg → hectograms (2 decimal precision)
      const now = new Date();
    
      const buffer = Buffer.alloc(10);
      buffer.writeUInt8(flags, 0);
      buffer.writeUInt16LE(weightHg, 1); // 2 bytes for weight
      buffer.writeUInt16LE(now.getFullYear(), 3);
      buffer.writeUInt8(now.getMonth() + 1, 5); // Month is 0-indexed
      buffer.writeUInt8(now.getDate(), 6);
      buffer.writeUInt8(now.getHours(), 7);
      buffer.writeUInt8(now.getMinutes(), 8);
      buffer.writeUInt8(now.getSeconds(), 9);
    
      return buffer;
    }
  
  
  function disconnectFromCentral() {
    exec('bluetoothctl disconnect', (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Failed to disconnect:', err);
      } else {
        console.log('✅ Disconnected from central to complete measurement');
      }
    });
  }