
var globalstate = {
  'isHosting': true
};
var musicShareWindowModule = require('./musicShareWindow_module.js');
const { app, BrowserWindow, Menu, ipcMain, session } = require('electron')
const notifier = require('node-notifier');
const fs = require('fs');
const tempDirectory = require('temp-dir');
const randomstring = require('randomstring');
const path = require('path');
const request = require('request');
const EventEmitter = require('events');
const client = require('discord-rich-presence')('582505724693839882');
const WebSocket = require('ws');
var ws = new WebSocket('ws://localhost:42124/');
var accounts = [];
globalstate.wssend = (json) => {

}
var updateDKey = () => {
  globalstate.DKey = randomstring.generate();
  globalstate.wssend({
    "type": "UPDATE_DKEY",
    "token": globalstate.Token,
    "Dkey": globalstate.DKey
  })
  try {
    globalstate.data.presenceData.joinSecret = globalstate.DKey
    globalstate.updatePresence()
  } catch(err) {}
}
globalstate.Token = randomstring.generate();
updateDKey()

var setupListeners = () => {
  ws.on('close', () => {
    delete ws
    var ws = new WebSocket('ws://localhost:42124/');
    setupListeners()
    globalstate.wssend= (json) => {

    }
  })
  ws.on('open', function open() {
    globalstate.wssend = (json) => {
      console.log("C --> S", json)
      ws.send(JSON.stringify(json))
    }
    if(globalstate.isHosting) {
      globalstate.wssend({
        "type": "AUTH",
        "authentication": {
          "kind": "token",
          "Dkey": globalstate.DKey,
          "token": globalstate.Token
        },
        "user": accounts
      })
    } else {
      globalstate.wssend({
        "type": "AUTH",
        "authentication": {
          "kind": "token",
          "Dkey": globalstate.connectTo
        },
        "user": accounts
      })
    }
  });
  ws.on('message', function message(data) {
    var data = JSON.parse(data)
    console.log("S --> C", data)
    if(data.close != false) {
      ws.close()
    }
    if(data.type == "PING") {
      globalstate.wssend({
        "type": "PONG"
      })
    }
    if(data.type == "SET_SONG") {
      globalstate.songStart = data.songStart
      globalwin.webContents.executeJavaScript(`document.location.href = "https://music.youtube.com/watch?v=${data.URL}"`, function (result) {
        //console.log(result)
      })
    }
    if(data.type == "DEAD_INSTANCE") {
      globalstate.wssend({
        "type": "AUTH",
        "authentication": {
          "kind": "token",
          "Dkey": globalstate.DKey,
          "token": globalstate.Token
        },
        "user": accounts
      })
      updateDKey = () => {
        globalstate.DKey = randomstring.generate();
        globalstate.wssend({
          "type": "UPDATE_DKEY",
          "token": globalstate.Token,
          "Dkey": globalstate.DKey
        })
        try {
          globalstate.data.presenceData.joinSecret = globalstate.DKey
          globalstate.updatePresence()
        } catch(err) {}
      }
      globalstate.isHosting = true;
      delete globalstate.connectTo
    }
    if(data.type == "SET_PLAY_PAUSE") {
      console.log(data.state)
      if(data.state == "play") {
        console.log("SETTING STATE PLAY")
        jsexecutewrapper((data) => {
          console.log("SETTING STATE PLAY")
          overrideviewtimer = false;
          window.songStart = data.songStart
          _ga_.playerController.playerApi.playVideo()
        })(data)
      }
      if(data.state == "pause") {
        console.log("SETTING STATE PAUSE")
        jsexecutewrapper((data) => {
          console.log("SETTING STATE PAUSE")
          overrideviewtimer = true;
          _ga_.playerController.playerApi.pauseVideo()
        })(data)
      }
    }
    if(data.type == "SET_SCRUB") {
      jsexecutewrapper((data) => {
        window.songStart = data.songStart
      })(data)
    }
    if(data.type == "ACCOUNT_JOIN") {
      var parsedUser = {
        'owner': data.user.owner,
      }
      data.user.user.forEach(account => {
        if(account.active) {
          parsedUser.email = account.email
          parsedUser.name = account.name,
          parsedUser.icon = account.photo_url
        }
      })
      musicShareWindowModule.NEW_USER(parsedUser)
    }
    if(data.type == "ACCOUNT_LEAVE") {
      var parsedUser = {
        'owner': data.user.owner,
      }
      data.user.user.forEach(account => {
        if(account.active) {
          parsedUser.email = account.email
          parsedUser.name = account.name,
          parsedUser.icon = account.photo_url
        }
      })
      musicShareWindowModule.REMOVE_USER(parsedUser)
    }
    if(data.type == "UPDATE_USER") {
      var parsedOldUser = {
        'owner': data.oldUser.owner,
      }
      data.oldUser.user.forEach(account => {
        if(account.active) {
          parsedUser.email = account.email
          parsedUser.name = account.name,
          parsedUser.icon = account.photo_url
        }
      })
      var parsedNewUser = {
        'owner': data.newUser.owner,
      }
      data.newUser.user.forEach(account => {
        if(account.active) {
          parsedUser.email = account.email
          parsedUser.name = account.name,
          parsedUser.icon = account.photo_url
        }
      })
      musicShareWindowModule.REMOVE_USER(parsedOldUser)
      musicShareWindowModule.NEW_USER(parsedNewUser)
    }
  });
}
setupListeners()

setInterval(updateDKey, 60000)




client.on('joinRequest', (data1, data2) => {
  console.log("RECIEVED JOINREQUEST FROM D_RPC", data1, data2)
  jsexecutewrapper((d1, d2) => {
    joinRequest(d1, d2)
  })(data1.user.username + "#" + data1.user.discriminator, data1)
})

client.on('join', (data1, data2) => {
  console.log("RECIEVED JOIN FROM D_RPC", data1)
  globalstate.isHosting = false;
  globalstate.connectTo = data1
  globalstate.wssend({
    "type": "AUTH",
    "authentication": {
      "kind": "Dkey",
      "Dkey": globalstate.connectTo
    },
    "user": accounts
  })
  updateDKey = () => {
    globalstate.DKey = randomstring.generate();
    try {
      globalstate.data.presenceData.joinSecret = globalstate.DKey
      globalstate.updatePresence()
    } catch(err) {}
  }
})

ipcMain.on('ipcacception', (userraw) => {
  client.reply(userraw, 'YES');
})
ipcMain.on('ipcrejection', (userraw) => {
  client.reply(userraw, 'IGNORE');
})


class MediaEmitter extends EventEmitter {}
class SocketEmitter extends EventEmitter {}
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
  if(globalstate.data.presenceData) {
    if((Date.now() - globalstate.data.lastUpdate) > globalstate.data.presenceLimit) {
      //console.log("updating presence")
      globalstate.data.updatenext = false;
      client.updatePresence(globalstate.data.presenceData)
      globalstate.data.lastUpdate = Date.now()
    } else {
      globalstate.data.updatenext = true;
      //console.log("attemped to update presence, but ratelimited.", (Date.now() - globalstate.data.lastUpdate), globalstate.data.presenceLimit )
    }
  }
}
setInterval(() => {
  if(globalstate.data.updatenext && (Date.now() - globalstate.data.lastUpdate) > globalstate.data.presenceLimit) {
    //console.log("UPDATE QUEUE")
    globalstate.updatePresence()
  }
}, 60)

globalstate.updatePresence();


const mediaEmitter = new MediaEmitter();
const onloadscript = fs.readFileSync(__dirname + "\\inject.js", 'utf-8')
//console.log(onloadscript)
process.on('uncaughtException', function(error) {
  console.log(error)
  showPopup("ERROR: " + String(error))
});
process.on('unhandledRejection', function(reason, p){
  console.log(reason)
  showPopup("ERROR: " + String(reason))
});
const express = require('express')
var bodyParser = require('body-parser')
const wapp = express()
wapp.use( bodyParser.json() );
const port = 59292

wapp.get('/settingsmod', (req, res) => {
  res.send(require('./settingsmod.js'))
})
wapp.get('/api/data', (req, res) => {
  res.set({
    "content-type": "application/json; charset=UTF-8"
  })
  res.send(globalstate.data)
})
wapp.get('/buggedPolymer.js', (req, res) => {
  res.send(fs.readFileSync(__dirname + "\\buggedPolymer.js") + "\n\n\n" + onloadscript)
})

wapp.listen(port, () => console.log(`Example app listening on port ${port}!`))
var globalwin;
musicShareWindowModule.initialize();
function createWindow () {
  // Create the browser window.
  let win = new BrowserWindow({
    minWidth: 500,
    minHeight: 500,
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
        webSecurity: false
    },
    frame: false,
    backgroundColor: "#000"
  })
  globalwin = win;

  //-webkit-app-region: drag

  // and load the index.html of the app.
  win.loadURL('https://music.youtube.com/')

  /*win.webContents.executeJavaScript(onloadscript, function (result) {
    //console.log(result)
  })*/
  win.on('closed', () => {
    win = null
  })


  win.webContents.session.webRequest.onBeforeRequest(['*'], (details, callback) => {
    ////console.log('onBeforeRequest details', details.url.split("?")[0]);
    const { url } = details;
    if(url.split("/")[url.split("/").length - 1] == "music_polymer.js") {
      //console.log(__dirname)
      const localURL = "http://localhost:59292/buggedPolymer.js"

      callback({
        cancel: false,
        redirectURL: ( encodeURI(localURL ) ),

      })
    } else {
      if(false) {
      } else {
        callback({
          cancel: false
        })
      }
    }

  });
  app.on('ready', () => [
    win.addDevToolsExtension(__dirname + "\\adBlockPlus")
  ])
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

ipcMain.on('accountDetails', (sender, a) => {
  var newaccounts = JSON.parse(a);
  if(JSON.stringify(accounts) != JSON.stringify(newaccounts)) {
    console.log(newaccounts)
    globalstate.wssend({
      'type': "UPDATE_USER",
      'user': newaccounts
    })
    accounts = newaccounts
  }
})

ipcMain.on('gawatchingUpdate', (sender, a) => {
  var gawatching = JSON.parse(a)
  globalstate.gawatching = gawatching
})

ipcMain.on('pageload', () => {
  if(!globalstate.isHosting) {
    jsexecutewrapper((globalstate) => {
      window.inGroup = true;
      window.songStart = globalstate.songStart
    })(globalstate)
  }
})

ipcMain.on('watchingUpdate', (sender, a) => {

  var overrideTime = false;

  var watching = JSON.parse(a)

  if(lastwatching.title != watching.title) {
    //console.log(globalstate.gawatching)
    watching.videoId = globalstate.gawatching.videoId,
    watching.views = globalstate.gawatching.viewCount
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
          ////console.log("DOWNLOADED")
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



var showPopup = (text) => {
  //console.log("popup", text)
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

var pluginEvents = (name, data) => {
  globalwin.webContents.executeJavaScript(`pluginEvent(${JSON.stringify(name)}, ${JSON.stringify(data)})`)
}
var jsexecutewrapper = (func) => {
  return (...args) => {
    globalwin.webContents.executeJavaScript(`(${String(func)})(${JSON.stringify(args).slice(1,-1)})`)
  }
}

process.stdin.on('data', (dataFragment) => {
  var dataString = String(dataFragment);
  process.stdout.write(exec(dataString) + "\n")
})
process.stdin.pause()



globalstate.emitter.on('LocationSwitch', () => {
//  //console.log("LOCATION CHANGED:", globalstate.data)
  pluginEvents('urlSwitch', globalstate.data)
})
globalstate.emitter.on('playpauseToggled', () => {
  ////console.log("PLAYPAUSETOGGLED:", globalstate.data)
  if(globalstate.data.listeningData.isPaused) {

    globalstate.data.presenceData.smallImageKey = "pause"
    globalstate.data.presenceData.startTimestamp = 0
    globalstate.data.presenceData.endTimestamp = 0
  } else {
    globalstate.data.presenceData.smallImageKey = "play"
    globalstate.data.presenceData.startTimestamp = Date.now()
    globalstate.data.presenceData.endTimestamp = Date.now() + (globalstate.data.listeningData.watching.time.length*1000 - globalstate.data.listeningData.watching.time.watched*1000)

  }
  pluginEvents('pauseToggled', globalstate.data)

  globalstate.updatePresence();
  globalstate.wssend({
    "type": "SET_PLAY_PAUSE",
    "token": globalstate.Token,
    "songStart": Date.now() - globalstate.data.listeningData.watching.time.watched*1000,
    "state": globalstate.data.presenceData.smallImageKey
  })
})
globalstate.emitter.on('SongSwitch', () => {
  ////console.log("SONGSWITCH:", globalstate.data)
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
  globalstate.data.presenceData.joinSecret = globalstate.DKey
  globalstate.data.presenceData.partyId = "SetPartyID @ " + Date.now()
  globalstate.updatePresence();
  pluginEvents('songSwitch', globalstate.data)
  globalstate.wssend({
    "type": "SET_SONG",
    "token": globalstate.Token,
    "songURL": globalstate.data.listeningData.watching.videoId
  })
})
globalstate.emitter.on('TimeShift', () => {
  ////console.log("TIMESHIFT:", globalstate.data)
  globalstate.data.presenceData.startTimestamp = Date.now()
  globalstate.data.presenceData.endTimestamp = Date.now() + (globalstate.data.listeningData.watching.time.length*1000 - globalstate.data.listeningData.watching.time.watched*1000)
  pluginEvents('timeShift', globalstate.data)
  globalstate.wssend({
    "type": "SET_SCRUB",
    "token": globalstate.Token,
    "songStart": Date.now() - globalstate.data.listeningData.watching.time.watched*1000
  })
})