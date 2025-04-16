var bleno = require('@abandonware/bleno');
var os=require('os')
var util=require('util')

let rawdata=require('./TestData/HealthThermometerTest.json');
var data=JSON.stringify(rawdata);
let test=JSON.parse(data);



let rawdata1=require('./../../../extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);

let rawdata2=require('../../../extra/Properties.json');
var data2=JSON.stringify(rawdata2);
let test2=JSON.parse(data2);

let rawdata3=require('../../../extra/Characteristic_UUIDs.json');
var data3=JSON.stringify(rawdata3);
let test3=JSON.parse(data3);

var BlenoCharacteristic=bleno.Characteristic;

var HealthThermometerCharacteristic=function(){

HealthThermometerCharacteristic.super_.call(this,{
	uuid:test3["HealthThermometer"].uuid,
	 properties:['indicate'],
         secure:['indicate']
     }
	)

};



HealthThermometerCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
   console.log(test1[1].string);

  this.counter = 1;
  this.index=1;
  var year=0x07E2;
  var month=test[this.index].month;
  var day=test[this.index].day;
  var hours=test[this.index].hours;
  var minutes=test[this.index].minutes;
  var seconds=test[this.index].seconds;
 
  this.changeInterval = setInterval(function() {
  
  var buff= Buffer.alloc(17);
  
 
  var Time=timeChange(year,month,day,hours,minutes, seconds);        //return values of time change function
  year=Time[0];
  month=Time[1];
  day=Time[2];
  hours=Time[3];
  minutes=Time[4];
  seconds=Time[5];  
  
  if(this.index==3){                      // if index == no of entries in json file+1  ; loop over
    this.index=1;
  }
 
  buff.writeIntLE(test[this.index].flag,0,1); //FLAGS 1 BYTE 
   

  
  buff.writeInt32LE(test[this.index].tempValue,1);    // temp measurement value 4 bytes
 
  

  
  buff.writeInt16LE(year,5);                //YEAR
  buff.writeIntLE(month,7);                    //MONTH                            //time  7 bytes
  buff.writeIntLE(day,8);                   //DAY
  buff.writeIntLE(hours,9);                   //Hours
  buff.writeIntLE(minutes,10);                   //minutes 
  buff.writeIntLE(seconds,11);                   //seconds                     
  
  buff.writeIntLE(test[this.index].tempType,12); 

  updateValueCallback(buff);
  
    console.log(test1[10].string+ buff+test1[7].string+ this.counter+ '\n');
      
   
    
    this.index++;    
    this.counter++;

  }.bind(this), 1000);
};

HealthThermometerCharacteristic.prototype.onUnsubscribe = function() {
    console.log(test1[2].string);

  if (this.changeInterval) {
    clearInterval(this.changeInterval);
    this.changeInterval = null;
  }
};

HealthThermometerCharacteristic.prototype.onIndicate= function() {
    console.log(test1[3].string);
};






util.inherits(HealthThermometerCharacteristic,BlenoCharacteristic);
module.exports=HealthThermometerCharacteristic;




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








