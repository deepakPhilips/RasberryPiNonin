var util = require('util');

var bleno = require('bleno');

var BlenoCharacteristic = bleno.Characteristic;
var Logger=require('/home/pi/Documents/RaspberryPi_Project/Logger.js');
 
var logger=new Logger();


let rawdata=require('./TestData/glucoseTest.json');
var data=JSON.stringify(rawdata);
let test=JSON.parse(data);

let rawdata1=require('/home/pi/Documents/RaspberryPi_Project/Buerer GL 50/extra/ConsoleLogComments.json');
var data1=JSON.stringify(rawdata1);
let test1=JSON.parse(data1);

let rawdata2=require('/home/pi/Documents/RaspberryPi_Project/Buerer GL 50/extra/Properties.json');
var data2=JSON.stringify(rawdata2);
let test2=JSON.parse(data2);

let rawdata3=require('/home/pi/Documents/RaspberryPi_Project/Buerer GL 50/extra/Characteristic_UUIDs.json');
var data3=JSON.stringify(rawdata3);
let test3=JSON.parse(data3);


var GlucoseMeasurementCharacteristic1 = function() {
  GlucoseMeasurementCharacteristic1.super_.call(this, {
    uuid:test3["GlucoseMeasurement"].uuid,
    properties: [ 'write', 'indicate'],
    value: null
  });

  this._value ;
  this._updateValueCallback = null;
};





GlucoseMeasurementCharacteristic1.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  this._value = data;
  
  this.counter = 1;
  this.limit=10;
  this.index=1;
  var noOfRecords=5;  
  this.limit=1000;
    
  var noOfMilliseconds=1000;     // 1 second= 1000 milliseconds 
 



 logger.log(test1[27].string+ this._value+'  '+this._value.toString('hex'));

  if (this._updateValueCallback) {
      logger.log(test1[28].string);
     
    
      if(this._value.toString('hex')=='11'){                                    //Normal
       
      this.changeInterval = setInterval(function() {
     
      var buff=Buffer.alloc(22);
 
      if(this.index==noOfRecords+1){                                  // if index == no of entries in json file+1  ; loop over
      this.index=1;
       } 
           

       if(this.counter===this.limit){
              
       console.log(test1[29].string);      
       this.index=6;
      
       clearInterval(this.changeInterval);
       this.changeInterval = null;
        } 
       logger.log('condition 1');
  
        buff.writeIntLE(test[this.index].flag,0,1);  // flag 1 byte
       
        buff.writeInt16LE(test[this.index].sequenceNo,1);  // SEQUENCE NUMBER 2 BYTE  

        var year=test[this.index].year;
        var month=test[this.index].month;
        var day=test[this.index].day;
        var hours=test[this.index].hours;
        var minutes=test[this.index].minutes;
        var seconds=test[this.index].seconds;
 


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



    
     logger.log(test1[8].string+ buff+test1[7].string+ this.counter+ '\n');
     this._updateValueCallback(buff);
     this.counter++;
    
    this.index++;
  }.bind(this), noOfMilliseconds);

  }










  if(this._value.toString('hex')=='15'){                                     // last record
      var buff=Buffer.alloc(22);
 
        this.index=noOfRecords;
        console.log('condition 2 last record');

  
        buff.writeIntLE(test[this.index].flag,0,1);  // flag 1 byte
       
        buff.writeInt16LE(test[this.index].sequenceNo,1);  // SEQUENCE NUMBER 2 BYTE  
  
        var year=test[this.index].year;
        var month=test[this.index].month;
        var day=test[this.index].day;
        var hours=test[this.index].hours;
        var minutes=test[this.index].minutes;
        var seconds=test[this.index].seconds;




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



     console.log('MockCharacteristic-IndicateRequest :  Value = '+ buff+'  Count=' + this.counter); 
     this._updateValueCallback(buff);
   
  } 
  
    
    
    if(this._value.toString('hex')=='16'){                                     // first record
      var buff=Buffer.alloc(22);
 
          this.index=1;
          console.log('condition 3 first record');

  
        buff.writeIntLE(test[this.index].flag,0,1);  // flag 1 byte
       
        buff.writeInt16LE(test[this.index].sequenceNo,1);  // SEQUENCE NUMBER 2 BYTE  
  
        var year=test[this.index].year;
        var month=test[this.index].month;
         var day=test[this.index].day;
        var hours=test[this.index].hours;
        var minutes=test[this.index].minutes;
         var seconds=test[this.index].seconds;



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



      console.log(test1[9].string+ buff+'  Count=' + this.counter); 
     this._updateValueCallback(buff);
   
  }  




 }

  callback(this.RESULT_SUCCESS);
};

GlucoseMeasurementCharacteristic1.prototype.onIndicate= function() {
   console.log(test1[3].string);
};

GlucoseMeasurementCharacteristic1.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
  console.log(test1[1].string);

  this._updateValueCallback = updateValueCallback;
};

GlucoseMeasurementCharacteristic1.prototype.onUnsubscribe = function() {
   console.log(test1[2].string);

  this._updateValueCallback = null;
  
    if (this.changeInterval) {
    clearInterval(this.changeInterval);
    this.changeInterval = null;
  }
};
module.exports =GlucoseMeasurementCharacteristic1;
util.inherits(GlucoseMeasurementCharacteristic1, BlenoCharacteristic);