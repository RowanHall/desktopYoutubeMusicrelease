const WebSocket = require('ws');

const fs = require('fs');
const wss = new WebSocket.Server({ port: 42124 });
var currentVersion = fs.readFileSync("../version.txt", 'utf-8')

var instances = [];
var sockets = [];

wss.on('connection', function connection(ws) {
  ws.lastPong = Date.now();
  sockets.push(ws)
  ws.on('close', ()=>{
    console.log("ON CLOSE")
    wsClosed(ws)
  })
  ws.on('message', function incoming(message) {
    try {
    message = JSON.parse(message);
    console.log(message.type)
      if(message.type == "AUTH") {
        if(message.authentication.kind == "token") {
          if(true) {
            //clear old data
            delete ws.type
            delete ws.user
            delete ws.instance
            console.log("ON TOKEN AUTH")
            wsClosed(ws)
          }
          //we know this is the master.
          sockets.push(ws)
          ws.selfauthenticated = true
          ws.type = 1;
          ws.user = message.user
          instances.push({
            "masterws": ws,
            "Dkey": message.authentication.Dkey,
            "token":message.authentication.token,
            "sockets": []
          })
          ws.instance = instances[instances.length - 1]
          ws.send(JSON.stringify({
            "type": "ACCOUNT_JOIN",
            "close": false,
            "user": {
              "user": ws.user,
              "owner": true
            }
          }))
        }
        if(message.authentication.kind == "Dkey") {
          if(true) {
            //clear old data
            ws.send(JSON.stringify({
              "type": "ACCOUNT_LEAVE",
              "close": false,
              "user": {
                "user": ws.user,
                "owner": true
              }
            }))
            delete ws.type
            delete ws.user
            delete ws.instance
            console.log("ON DKEY AUTH")
            wsClosed(ws)
          }
          sockets.push(ws)
          //we know this is the client.
          ws.type = 0
          var parentSocket = "NOT FOUND"
          instances.forEach(instance => {
            if(instance.Dkey == message.authentication.Dkey) {
              parentSocket = instance
            }
          })
          if(parentSocket != "NOT FOUND") {
            ws.selfauthenticated = true
            ws.instance = parentSocket
            ws.user = message.user
            parentSocket.masterws.send(JSON.stringify({
              "type": "ACCOUNT_JOIN",
              "close": false,
              "user": {
                "user": ws.user,
                "owner": false
              }
            }))
            parentSocket.sockets.forEach(ws2 => {
              ws2.send(JSON.stringify({
                "type": "ACCOUNT_JOIN",
                "close": false,
                "user": {
                  "user": ws.user,
                  "owner": false
                }
              }))
            })
            parentSocket.sockets.push(ws)
            var accounts = []
            accounts.push({"user": parentSocket.masterws.user, "owner": true})
            parentSocket.sockets.forEach(socket => {
              accounts.push({"user": socket.user, "owner": false})
            })
            ws.send(JSON.stringify({
              "type": "SET_SONG",
              "close": false,
              "URL": parentSocket.songURL,
              "songStart": parentSocket.songStart,
              "accounts":accounts
            }))
          } else {
            ws.send(JSON.stringify({
              "type": "ERROR",
              "close": true,
              "ERROR": "Did not find instance by Dkey: " + message.authentication.Dkey
            }))
          }
        }
      }
      if(message.type == "SET_SONG" && ws.type == 1 && message.token == ws.instance.token) {
        ws.instance.songURL = message.songURL
        ws.instance.songStart = Date.now()
        ws.instance.sockets.forEach(socket => {
          socket.send(JSON.stringify({
            "type": "SET_SONG",
            "close": false,
            "URL": message.songURL,
            "songStart": ws.instance.songStart
          }))
        })
      }
      if(message.type == "SET_PLAY_PAUSE" && ws.type == 1 && message.token == ws.instance.token) {
        ws.instance.isPaused = (message.state == "pause")
        ws.instance.songStart = message.songStart
        ws.instance.sockets.forEach(socket => {
          socket.send(JSON.stringify({
            "type": "SET_PLAY_PAUSE",
            "state": message.state,
            "songStart": message.songStart,
            "close": false
          }))
        })
      }
      if(message.type == "SET_SCRUB" && ws.type == 1 && message.token == ws.instance.token) {
        ws.instance.songStart = message.songStart
        ws.instance.sockets.forEach(socket => {
          socket.send(JSON.stringify({
            "type": "SET_SCRUB",
            "songStart": message.songStart,
            "close": false
          }))
        })
      }
      if(message.type == "UPDATE_DKEY" && ws.type == 1 && message.token == ws.instance.token) {
        ws.instance.Dkey = message.Dkey
      }
      if(message.type == "KICK_USER" && ws.type == 1) {
        //get user ws by email
        ws.instance.sockets.forEach(socket => {
          socket.user.forEach(user => {
            if(user.active && user.email == message.email) {
              socket.send(JSON.stringify({
                "type": "DEAD_INSTANCE",
                "close": false,
                "user": socket.user
              }))
              
              instance.masterws.send(JSON.stringify({
                "type": "ACCOUNT_LEAVE",
                "close": false,
                "user": {'user': socket.user}
              }))
              instance.sockets.forEach(ws2 => {
                ws2.send(JSON.stringify({
                  "type": "ACCOUNT_LEAVE",
                  "close": false,
                  "user": {'user': socket.user}
                }))
              })
            }
          })
        })
      }
      if(message.type == "UPDATE_USER") {
        if(ws.type == 1 ) {
          ws.instance.masterws.send(JSON.stringify({
            "type": "UPDATE_USER",
            "oldUser": {"user": ws.user, "owner": true},
            "newUser": {"user": message.user, "owner": true},
            "close": false
          }))
          ws.instance.sockets.forEach(socket => {
            socket.send(JSON.stringify({
              "type": "UPDATE_USER",
              "oldUser": {"user": ws.user, "owner": true},
              "newUser": {"user": message.user, "owner": true},
              "close": false
            }))
          })
          ws.user = message.user
        }
        if(ws.type == 0 ) {
          ws.instance.masterws.send(JSON.stringify({
            "type": "UPDATE_USER",
            "oldUser": {"user": ws.user, "owner": false},
            "newUser": {"user": message.user, "owner": false},
            "close": false
          }))
          ws.instance.sockets.forEach(socket => {
            socket.send(JSON.stringify({
              "type": "UPDATE_USER",
              "oldUser": {"user": ws.user, "owner": false},
              "newUser": {"user": message.user, "owner": false},
              "close": false
            }))
          })
          ws.user = message.user
        }
      }
      if(message.type == "PONG") {
        ws.lastPong = Date.now()
      }

  }catch(err) {
    ws.send(JSON.stringify({
      "type": "ERROR",
      "close": true,
      "ERROR": String(err)
    }))
  }

  });
});

setInterval(() => {
  //console.log(sockets)
  sockets.forEach(ws => {
    //console.log("SENT PING TO ", ws.lastPong)
    ws.send(JSON.stringify({
      "type": "PING",
      "close": false
    }))
    if(Date.now() - ws.lastPong > 7500) {
      console.log("TIME OUT")
      wsClosed(ws)
      ws.terminate()
    }
  })
}, 5000)

var wsClosed = (socket) => {
  console.log("closing", socket.user)
  sockets.forEach((socket2, index) => {
    if(socket == socket2) {
      sockets.splice(index, 1);
    }
  })
  instances.forEach((instance, index) => {
    instance.sockets.forEach((socket2, index2) => {
      if(socket2 == socket) {
        instances[index].sockets.splice(index2, 1);
        instance.masterws.send(JSON.stringify({
          "type": "ACCOUNT_LEAVE",
          "close": false,
          "user": {'user': socket.user}
        }))
        instance.sockets.forEach(ws2 => {
          ws2.send(JSON.stringify({
            "type": "ACCOUNT_LEAVE",
            "close": false,
            "user": {'user': socket.user}
          }))
        })
      }
    })
    if(instance.masterws == socket) {
      instances.splice(index, 1);
      instance.sockets.forEach(ws2 => {
        ws2.send(JSON.stringify({
          "type": "DEAD_INSTANCE",
          "close": false,
          "user": socket.user
        }))
      })
    }
  })
}

// update Server

const express = require('express')
const app = express()
const port = 42125

app.get('/getLatestVersion', (req, res) => res.send(currentVersion))
app.get('/getUpdateZip', (req, res) => res.send(fs.readFileSync("./update.zip")))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))