var bleno=require('bleno')
var os=require('os')
var util=require('util')


let rawdata=require('./TestData/glucoseTest.json');
var data=JSON.stringify(rawdata);
let test=JSON.parse(data);
var Logger=require('/home/pi/Documents/RaspberryPi_Project/Logger.js');
 
var logger=new Logger();

let rawdata1=require('/home/pi/Documents/RaspberryPi_Project/Contour GL/extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);

let rawdata2=require('/home/pi/Documents/RaspberryPi_Project/Contour GL/extra/Properties.json');
var data2=JSON.stringify(rawdata2);
let test2=JSON.parse(data2);

let rawdata3=require('/home/pi/Documents/RaspberryPi_Project/Contour GL/extra/Characteristic_UUIDs.json');
var data3=JSON.stringify(rawdata3);
let test3=JSON.parse(data3);

var BlenoCharacteristic=bleno.Characteristic;

var GlucoseMeasurementCharacteristic=function(){

GlucoseMeasurementCharacteristic.super_.call(this,{
	uuid:test3["GlucoseMeasurement"].uuid,
	 properties:['indicate'],
         secure:['indicate']
     }
	)

};



GlucoseMeasurementCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
   logger.log(test1[1].string);

  this.counter = 1;
  this.index=1;
  var year=test[this.index].year;
  var month=test[this.index].month;
  var day=test[this.index].day;
  var hours=test[this.index].hours;
  var minutes=test[this.index].minutes;
  var seconds=test[this.index].seconds;
 
  this.changeInterval = setInterval(function() {
  
  var buff=Buffer.alloc(22);
 
  if(this.index==3){                                  // if index == no of entries in json file+1  ; loop over
    this.index=1;
  } 
  

  
  buff.writeIntLE(test[this.index].flag,0,1);  // flag 1 byte
       
  buff.writeInt16LE(test[this.index].sequenceNo,1);  // SEQUENCE NUMBER 2 BYTE  
  
  var Time=timeChange(year,month,day,hours,minutes, seconds);        //return values of time change function
  year=Time[0];
  month=Time[1];
  day=Time[2];
  hours=Time[3];
  minutes=Time[4];
  seconds=Time[5];
  



  buff.writeInt16LE(year,3);                //YEAR
  buff.writeIntLE(month,5);                    //MONTH                            //time stamp  7 bytes
  buff.writeIntLE(day,6);                   //DAY  
  buff.writeIntLE(hours,7);                   //Hours
  buff.writeIntLE(minutes,8);                   //minutes 
  buff.writeIntLE(seconds,9);                   //seconds  

  buff.writeInt16LE(test[this.index].timeOffset,10);                //time  offset  2 bytes
                      
  buff.writeInt16LE(test[this.index].glucose,12);             //Glucose Conc. 2 bytes
  buff.writeIntLE(test[this.index].type,14);                 //TYPE and   1 /2 BYTE
  buff.writeIntLE(test[this.index].location,15)                             //sample location 1/2 byte        
  //buff.writeInt16LE(test[this.index].sensorStatus,16);               //sensor status 2 bytes                   

  updateValueCallback(buff);
  
  logger.log(test1[8].string+ buff+test1[7].string+ this.counter+ '\n');

    this.counter++;
    this.index++;
  }.bind(this), 1000);
};

GlucoseMeasurementCharacteristic.prototype.onUnsubscribe = function() {
   logger.log(test1[2].string);

  if (this.changeInterval) {
    clearInterval(this.changeInterval);
    this.changeInterval = null;
  }
};

GlucoseMeasurementCharacteristic.prototype.onIndicate= function() {
   logger.log(test1[3].string);
};




util.inherits(GlucoseMeasurementCharacteristic,BlenoCharacteristic);
module.exports=GlucoseMeasurementCharacteristic;




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






