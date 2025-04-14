var bleno=require('bleno')
var os=require('os')
var util=require('util')

let rawdata=require('./TestData/bloodPressureTest.json');
var data=JSON.stringify(rawdata);
let test=JSON.parse(data);


var Logger=require('/home/pi/Documents/RaspberryPi_Project/Logger.js');
var logger=new Logger();

let rawdata1=require('/home/pi/Documents/RaspberryPi_Project/Buerer BM 57/extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);

let rawdata2=require('/home/pi/Documents/RaspberryPi_Project/Buerer BM 57/extra/Properties.json');
var data2=JSON.stringify(rawdata2);
let test2=JSON.parse(data2);

let rawdata3=require('/home/pi/Documents/RaspberryPi_Project/Buerer BM 57/extra/Characteristic_UUIDs.json');
var data3=JSON.stringify(rawdata3);
let test3=JSON.parse(data3);

var BlenoCharacteristic=bleno.Characteristic;

var BloodPressureCharacteristic=function(){

BloodPressureCharacteristic.super_.call(this,{
	 uuid:test3["BloodPressure"].uuid,
	 properties:['indicate'],
         secure:['indicate']
     }
	)

};



BloodPressureCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
  logger.log(test1[1].string);


  this.counter = 1;
  this.index=1;
  var year=0x07E2;
  var month=test[this.index].month;
  var day=test[this.index].day;
  var hours=test[this.index].hours;
  var minutes=test[this.index].minutes;
  var seconds=test[this.index].seconds;
  var noOfEntries=2;
  var noOfMilliseconds=1000;     // 1 second= 1000 milliseconds 
 
  this.changeInterval = setInterval(function() {
  
  var buff= Buffer.alloc(25);
  
 
  var Time=timeChange(year,month,day,hours,minutes, seconds);        //return values of time change function
  year=Time[0];
  month=Time[1];
  day=Time[2];
  hours=Time[3];
  minutes=Time[4];
  seconds=Time[5];  
  
  if(this.index==noOfEntries+1){                      // if index == no of entries in json file+1  ; loop over
    this.index=1;
  }
 
  buff.writeIntLE(test[this.index].flag,0,1); //FLAGS 1 BYTE 
   

  
  buff.writeInt16LE(test[this.index].systolic,1);    // Systolic 2 byte
  buff.writeInt16LE(test[this.index].diastolic,3);    // Dia 2 byte
  buff.writeInt16LE(test[this.index].mean,5);    // mean 2 byte
  

  
  buff.writeInt16LE(year,7);                //YEAR
  buff.writeIntLE(month,9);                    //MONTH                            //time  7 bytes
  buff.writeIntLE(day,10);                   //DAY
  buff.writeIntLE(hours,11);                   //Hours
  buff.writeIntLE(minutes,12);                   //minutes 
  buff.writeIntLE(seconds,13);                   //seconds                     
  
 

  buff.writeInt16LE(test[this.index].pulseRate,14);                 // pulse rate 2 byte 
  buff.writeIntLE(0x01,16);                 //userID        1 BYTE
  buff.writeInt16LE(test[this.index].measurementStatus,17);               //Measurement Status  2 BYTES

  updateValueCallback(buff);
  
 logger.log(test1[4].string+ + this.counter);
      
   
    
    this.index++;    
    this.counter++;

  }.bind(this), noOfMilliseconds);
};

BloodPressureCharacteristic.prototype.onUnsubscribe = function() {
    logger.log(test1[2].string);

  if (this.changeInterval) {
    clearInterval(this.changeInterval);
    this.changeInterval = null;
  }
};

BloodPressureCharacteristic.prototype.onIndicate= function() {
    logger.log(test1[3].string);
};




util.inherits(BloodPressureCharacteristic,BlenoCharacteristic);
module.exports=BloodPressureCharacteristic;




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








