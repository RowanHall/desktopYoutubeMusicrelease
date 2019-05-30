const { app, BrowserWindow, Menu, ipcMain, session } = require('electron')
const notifier = require('node-notifier');
const fs = require('fs');
const tempDirectory = require('temp-dir');
const path = require('path');
const request = require('request');
const ioHook = require('iohook');
const EventEmitter = require('events');
const client = require('discord-rich-presence')('582505724693839882');

client.on('joinRequest', (data) => {
  console.log("RECIEVED JOINREQUEST FROM D_RPC", data)
})
client.on('join', (data) => {
  console.log("RECIEVED JOIN FROM D_RPC", data)
})

class MediaEmitter extends EventEmitter {}

var globalstate = {};
globalstate.emitter = new MediaEmitter();
globalstate.data = {
  isListening: false,
  listeningData: {},
  path: "",
  presenceData: {
    state: 'Homepage',
    details: 'N/A',
    startTimestamp: 0,
    endTimestamp: 0,
    largeImageKey: 'listening',
    instance: true,
  },
  lastUpdate: 0,
  presenceLimit: 1000,
  updatenext: false
};

globalstate.updatePresence = () => {
  if((Date.now() - globalstate.data.lastUpdate) > globalstate.data.presenceLimit) {
    console.log("updating presence")
    globalstate.data.updatenext = false;
    client.updatePresence(globalstate.data.presenceData)
    globalstate.data.lastUpdate = Date.now()
  } else {
    globalstate.data.updatenext = true;
    console.log("attemped to update presence, but ratelimited.", (Date.now() - globalstate.data.lastUpdate), globalstate.data.presenceLimit )
  }
}
setInterval(() => {
  if(globalstate.data.updatenext && (Date.now() - globalstate.data.lastUpdate) > globalstate.data.presenceLimit) {
    console.log("UPDATE QUEUE")
    globalstate.updatePresence()
  }
}, 60)

globalstate.updatePresence();


const mediaEmitter = new MediaEmitter();
const onloadscript = `const { remote } = require('electron')
document.getElementsByClassName('left-content style-scope ytmusic-nav-bar')[0].style.webkitAppRegion = "drag"
const ipc = require('electron').ipcRenderer
var oldwatching = {};
setInterval(() => {
  var root = document.getElementsByClassName("middle-controls style-scope ytmusic-player-bar")[0]
  var watching = {};
  watching.icon = {};
  watching.icon.src = root.children[0].src
  watching.title = root.children[1].children[0].innerText
  var c = Array.from(root.children[1].children[1].children[2].children[0].children)
  d = c.pop()
  watching.album = {"name": d.innerText, "loc": d.href}
  watching.authors = []
  c.forEach(i => {
  	watching.authors.push({"name": i.innerText, "loc": i.href})
  })
  
  watching.meta = {}
  watching.meta.inFocus = document.hasFocus()
  var timestr = document.getElementsByClassName('time-info style-scope ytmusic-player-bar')[0].innerText.split(" / ")
  watching.time = {};
  watching.time.watched = (parseInt(timestr[0].split(":")[0])*60) + (parseInt(timestr[0].split(":")[1]))
  watching.time.length = (parseInt(timestr[1].split(":")[0])*60) + (parseInt(timestr[1].split(":")[1]))
  
  ipc.send('watchingUpdate', JSON.stringify(watching))
  ipc.send('locupdate', document.location.href)
  ipc.send('pausedupdate', (!(document.getElementById('play-pause-button').title.toLowerCase() == 'pause')))
}, 10)
`

process.on('uncaughtException', function(error) {
  showPopup("ERROR: " + String(error))
});
process.on('unhandledRejection', function(reason, p){
  console.log(reason)
  showPopup("ERROR: " + String(reason))
});
const express = require('express')
const wapp = express()
const port = 59292

wapp.post('/settingsmod', (req, res) => {
  res.set({
    "content-type": "application/json; charset=UTF-8"
  })
  res.send(fs.readFileSync(__dirname + "/settings.JSON"))
})
wapp.get('/api/data', (req, res) => {
  res.set({
    "content-type": "application/json; charset=UTF-8"
  })
  res.send(globalstate.data)
})
wapp.get('/buggedPolymer.js', (req, res) => {
  res.send(fs.readFileSync(__dirname + "/buggedPolymer.js"))
})

wapp.listen(port, () => console.log(`Example app listening on port ${port}!`))
var globalwin;
function createWindow () {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    frame: false,
    backgroundColor: "#000",
    webPreferences: {
      webSecurity: false
    }
  })
  globalwin = win;

  //-webkit-app-region: drag

  // and load the index.html of the app.
  win.loadURL('https://music.youtube.com/')
  
  win.webContents.executeJavaScript(onloadscript, function (result) {
    console.log(result)
  })
  win.on('closed', () => {
    win = null
  })
  
  
  win.webContents.session.webRequest.onBeforeRequest(['*'], (details, callback) => {
    //console.log('onBeforeRequest details', details.url.split("?")[0]);
    const { url } = details;
    if(url == "https://music.youtube.com/s/music/2e3616b2/music_polymer.js") {
      console.log(__dirname)
      const localURL = "http://localhost:59292/buggedPolymer.js"
    
      callback({
        cancel: false,
        redirectURL: ( encodeURI(localURL ) ),
        
      })
    } else {
      if(url.split("?")[0] == "https://music.youtube.com/youtubei/v1/account/get_setting") {
        console.log(__dirname)
        const localURL = "http://localhost:59292/settingsmod"
      
        callback({
          cancel: false,
          redirectURL: ( encodeURI(localURL ) )
        })
      } else {
        callback({
          cancel: false
        })
      }
    }
    
  });
}

app.on('ready', () => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})
var lastwatching = {'title': {}}

var lastlocation = globalstate.data.path
ipcMain.on('locupdate', (sender, location) => {
  if(location != lastlocation) {
    globalstate.data.path = location;
    lastlocation = location;
    globalstate.emitter.emit("LocationSwitch")
  }
})
ipcMain.on('pausedupdate', (sender, a) => {
  if(a != globalstate.data.listeningData.isPaused) {
    globalstate.data.listeningData.isPaused = a
    globalstate.emitter.emit("playpauseToggled")
  }
})

ipcMain.on('watchingUpdate', (sender, a) => {

  var overrideTime = false;
  
  var watching = JSON.parse(a)
  
  if(lastwatching.title != watching.title) {
    
    
    globalstate.data.listeningData = {
      isPaused: false,
      watching: watching
    }
    globalstate.emitter.emit("SongSwitch")
    if(watching.title != '') {
      //new video
      
      if(!watching.meta.inFocus) {
        //not in focus right now
        var stream = request(watching.icon.src.split('=')[0] + "=w240-h240-l90-rj").pipe(fs.createWriteStream(tempDirectory + "/VIDEO_IMG.jpg"))
        var a = [];
        watching.authors.forEach(author => {
          a.push(author.name)
        })
        var str = a.length == 1 ? a[0] : [ a.slice(0, a.length - 1).join(", "), a[a.length - 1] ].join(" and ")
        stream.on('finish', () => {
          //console.log("DOWNLOADED")
          notifier.notify({
            title: "Playing: " + watching.title,
            message: 'By: ' + str,
            icon: tempDirectory + "/VIDEO_IMG.jpg", // Absolute path (doesn't work on balloons)
            sound: false // Only Notification Center or Windows Toasters
          })
        })
        
      }
    }
    overrideTime = true;
  }
  try {
    if(Math.abs(lastwatching.time.watched-watching.time.watched) > 1 && !overrideTime) {
      globalstate.emitter.emit("TimeShift")
    }
  } catch(e) {}
  lastwatching = watching
  globalstate.data.listeningData.watching.time = watching.time
})

var pause = () => {
  
}

ioHook.on('keyup', event => {
  //console.log(event.rawcode)
  mediaEmitter.emit(String(event.rawcode));
});

// Register and start hook
ioHook.start();


var showPopup = (text) => {
  console.log("popup", text)
  globalwin.webContents.executeJavaScript(`nt(document.getElementsByTagName('ytmusic-app')[0], 'yt-open-popup-action', [{
    "openPopupAction": {
      "popupType": "TOAST",
      "popup": {
        "notificationActionRenderer": {
          "responseText": {
            "runs": [
              {
                "text": "${text}"
              }
            ]
          },
          "trackingParams": ""
        }
      }
    }
  }, document.getElementsByTagName('ytmusic-app')[0]])`)
}

mediaEmitter.on('179', () => {
    globalwin.webContents.executeJavaScript(`document.getElementById('play-pause-button').click()`, () => {})
});
mediaEmitter.on('177', () => {
  globalwin.webContents.executeJavaScript(`document.getElementsByClassName('previous-button style-scope ytmusic-player-bar')[0].click()`, () => {})
});
mediaEmitter.on('176', () => {
  globalwin.webContents.executeJavaScript(`document.getElementsByClassName('next-button style-scope ytmusic-player-bar')[0].click()`, () => {})
});

process.stdin.on('data', (dataFragment) => {
  var dataString = String(dataFragment);
  process.stdout.write(exec(dataString) + "\n")
})
process.stdin.pause()



globalstate.emitter.on('LocationSwitch', () => {
//  console.log("LOCATION CHANGED:", globalstate.data)
})
globalstate.emitter.on('playpauseToggled', () => {
  //console.log("PLAYPAUSETOGGLED:", globalstate.data)
  if(globalstate.data.listeningData.isPaused) {
    globalstate.data.presenceData.smallImageKey = "pause"
    globalstate.data.presenceData.startTimestamp = 0
    globalstate.data.presenceData.endTimestamp = 0
  } else {
    globalstate.data.presenceData.smallImageKey = "play"
    globalstate.data.presenceData.startTimestamp = Date.now()
    globalstate.data.presenceData.endTimestamp = Date.now() + (globalstate.data.listeningData.watching.time.length*1000 - globalstate.data.listeningData.watching.time.watched*1000)
  }
  
  globalstate.updatePresence();
})
globalstate.emitter.on('SongSwitch', () => {
  //console.log("SONGSWITCH:", globalstate.data)
  globalstate.data.presenceData.details = "Listening to: " + globalstate.data.listeningData.watching.title
  var a = [];
  globalstate.data.listeningData.watching.authors.forEach(author => {
    a.push(author.name)
  })
  var str = a.length == 1 ? a[0] : [ a.slice(0, a.length - 1).join(", "), a[a.length - 1] ].join(" and ")
  globalstate.data.presenceData.state = "By: " + str
  globalstate.data.presenceData.startTimestamp = Date.now()
  globalstate.data.presenceData.endTimestamp = Date.now() + globalstate.data.listeningData.watching.time.length*1000
  globalstate.data.presenceData.smallImageKey = "play"
  globalstate.data.presenceData.joinSecret = "SetJoinSecret @ " + Date.now()
  globalstate.updatePresence();
})
globalstate.emitter.on('TimeShift', () => {
  //console.log("TIMESHIFT:", globalstate.data)
  globalstate.data.presenceData.startTimestamp = Date.now()
  globalstate.data.presenceData.endTimestamp = Date.now() + (globalstate.data.listeningData.watching.time.length*1000 - globalstate.data.listeningData.watching.time.watched*1000)
  
})