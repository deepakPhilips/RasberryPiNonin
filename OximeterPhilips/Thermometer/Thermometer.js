var bleno = require('@abandonware/bleno');
var program = require('commander').program;
var fs = require('fs');

// Load device configuration
var deviceConfig = require('./thermometerConfig.json');

var { createPrimaryService } = require('./ThermometerService');
var {
    createCharacteristic,
    createNotifyCharacteristic,
} = require('./ThermometerCharacteristic');

var  counter = 0;
let rawdata=require('../../Philips Ear Thermometer/Services/characteristics/HealthThermometer/TestData/HealthThermometerTest.json');
var data=JSON.stringify(rawdata);
let test=JSON.parse(data);

program
    .requiredOption('-t, --temperature <n>', 'temperature', parseFloat)
    .parse(process.argv);

const options = program.opts();

bleno.on('stateChange', handleStateChange);
bleno.on('accept', handleAccept);
bleno.on('disconnect', handleDisconnect);
bleno.on('advertisingStart', handleAdvertisingStart);

function handleStateChange(state) {
    console.log('GATT Thermometer server running');
    console.log('Termperature value: %j,', options.temperature,);
    if (state === 'poweredOn') {
        bleno.startAdvertising(deviceConfig.broadcastingName, [
            '180A',
            deviceConfig.readingServiceID,
            deviceConfig.broadcastingServiceID,
        ]);
    } else {
        bleno.stopAdvertising();
    }
}

function handleAccept(clientAddress) {
    console.log('connected to: ' + clientAddress);
}

function handleDisconnect() {
    console.log("Disconnected");
    // process.exit(0);
}

function handleAdvertisingStart(error) {
    if (error) {
        console.error('Error starting advertising:', error);
        return;
    }

    console.log('Started advertising');
    bleno.setServices([
        createPrimaryService('180A', [
            createCharacteristic('2A29', ['read'], deviceConfig.manufacturer, 'Manufacturer Name'),
            createCharacteristic('2A24', ['read'], deviceConfig.model, 'Model'),
            createCharacteristic('2A25', ['read'], 'thermo_sim', 'Serial'),
            createCharacteristic('2A28', ['read'], 'v1.0', 'Software Revision'),
            createCharacteristic('2A26', ['read'], 'Firmware v1.0', 'Firmware Revision'),
        ]),
        createPrimaryService(deviceConfig.readingServiceID, [
            createNotifyCharacteristic(
                deviceConfig.characteristicID,
                'Temperature Measurement',
                handleMeasurementSubscribe,
                handleMeasurementUnsubscribe,
                () => options.temperature // 💡 callback that provides the temp
            ),
        ]),
    ]);
}

// function createPrimaryService(uuid, characteristics) {
//     return new PrimaryService({ uuid, characteristics });
// }

// function createCharacteristic(uuid, properties, value, descriptorValue) {
//     return new Characteristic({
//         uuid,
//         properties,
//         value: Buffer.from(value),
//         descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
//     });
// }

// function createNotifyCharacteristic(uuid, descriptorValue, onSubscribe, onUnsubscribe) {
//     return new Characteristic({
//         uuid,
//         properties: ['notify'],
//         descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
//         onSubscribe,
//         onUnsubscribe,
//     });
// }


function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
console.log("🚀 ~ handleMeasurementSubscribe ~ updateValueCallback:")


    this.counter = 1;
    this.index = 1;
    let year = 0x07E2;
    let month = test[this.index].month;
    let day = test[this.index].day;
    let hours = test[this.index].hours;
    let minutes = test[this.index].minutes;
    let seconds = test[this.index].seconds;
  
    this.changeInterval = setInterval(() => {
      const buff = Buffer.alloc(13); // 1 (flags) + 4 (temp) + 7 (timestamp) + 1 (type)
  
      // Get and update time
      const Time = timeChange(year, month, day, hours, minutes, seconds);
      [year, month, day, hours, minutes, seconds] = Time;
  
      // Reset index if at end
      if (this.index >= test.length) {
        this.index = 1;
      }
  
      const entry = test[this.index];
      
      // 1. Write Flags
      buff.writeUInt8(entry.flag, 0); // 1 byte
  
      // 2. Write IEEE-11073 Float (4 bytes)
      const tempFloat = ieee11073Float(entry.tempValue);
      tempFloat.copy(buff, 1);
  
      // 3. Timestamp (7 bytes)
      buff.writeUInt16LE(year, 5);     // Year (2 bytes)
      buff.writeUInt8(month, 7);       // Month (1 byte)
      buff.writeUInt8(day, 8);         // Day (1 byte)
      buff.writeUInt8(hours, 9);       // Hours (1 byte)
      buff.writeUInt8(minutes, 10);    // Minutes (1 byte)
      buff.writeUInt8(seconds, 11);    // Seconds (1 byte)
  
      // 4. Temp Type (1 byte)
      buff.writeUInt8(entry.tempType, 12); // Temperature type (1 byte)
  
      // Send value
      updateValueCallback(buff);
    
    }, 1000); // Send every second
}

function handleMeasurementUnsubscribe() {
    console.log('Measurement unsubscribed');
    // process.exit(3);
}


function isValidMeasurement(temperature) {
    return temperature > 35 && temperature < 42; // Valid human body temperature range
}


function processMeasurement() {
    counter++;
    const tempHex = Math.round(options.temperature * 100).toString(16).padStart(4, '0');
    const temp1 = parseInt(tempHex.slice(0, 2), 16);
    const temp2 = parseInt(tempHex.slice(2, 4), 16);
    return [0x0a, 0x15, 0x1e, 0x00, counter, temp1, temp2];
}


const ieee11073Float = (tempCelsius) => {
    const flags = 0x00; // Not used here, handled separately
    const exponent = -2; // Means divide by 100
    const mantissa = Math.round(tempCelsius * 100);
  
    const buffer = Buffer.alloc(4);
    buffer.writeIntLE(mantissa + (exponent << 24), 0, 4); // Combine mantissa and exponent
    return buffer;
  };



  var timeChange=function(year,month,day,hours,minutes, seconds){
    
  if(seconds>0x3B){                //seconds>59    
   minutes++; 
   seconds=0x00;
  }
  if(minutes>0x3B){                //minutes>59                            // TIME CHANGE LOGIC
   hours++;
   minutes=0x00;
  }
  if(hours>0x17) {                  // hours>23
   hours=0x00;
   minutes=0x00;
   seconds=0x00;
  }
   seconds++;
  
  if (hours==0x00) {
  if (month%2!=0 && month<=0x07)
    {
        if (day==0x1F)
        {
            day=0x01;
            month=month+1;
            
        }
    }
    else if (month%2==0x00 && 0x08<=month<=0x0C)
    {
        if (day==0x1F)
        {
            day=0x01;
            month=month+1;
           
            
        }
    }
    else if (month%2==0 && 0x04<=month<=0x06)                           //DATE CHANGE   LOGIC 
    {
        if (day==0x1E)
        {
            day=1;
            month=1;
            
        }
    }
    else if (month%2!=0 && 0x09<=month<=0x0B)
    {
        if (day==0x1E)
        {
            day=1;
            month=month+1;
            
          
        }
    }
    else if (month==2 && year%4==0)
    {
        if (day==0x1D)
        {
            day=1;
            month=month+1;
            
            
        }
    }
    else if (month==2 && year%4!=0)
    {
        if (day==0x01C)
        {
            day=1;
            month=month+1;
           
           
        }
    }
    else if (month==0x0C && day==0X1F)
    {
        day=1;
        month=1;
        year=year+1;
       
    }
    else
    {
        day=day+1;
        month=month;
       
        
    }
  }

return [year,month,day,hours,minutes, seconds];
           
};

