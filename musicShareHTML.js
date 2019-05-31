const { ipcRenderer } = require('electron')
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

window.myEmitter = new MyEmitter();

myEmitter.on('NEW_USER' , function(data){
  console.log(data)
});