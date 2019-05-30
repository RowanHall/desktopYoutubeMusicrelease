const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 42124 });

var instances = [];
var sockets = [];

wss.on('connection', function connection(ws) {
  ws.lastPong = Date.now();
  sockets.push(ws)
  ws.on('close', ()=>{
    wsClosed(ws)
  })
  ws.on('message', function incoming(message) {
    try {
    message = JSON.parse(message);
      if(!(ws.selfauthenticated) && message.type == "AUTH") {
        if(message.authentication.kind == "token") {
          //we know this is the master.
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
        }
        if(message.authentication.kind == "Dkey") {
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
            parentSocket.sockets.push(ws)
            socket.send(JSON.stringify({
              "type": "SET_SONG",
              "close": false,
              "URL": parentSocket.songURL
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
        ws.instance.sockets.forEach(socket => {
          socket.send(JSON.stringify({
            "type": "SET_SONG",
            "close": false,
            "URL": message.songURL
          }))
        })
      }
      if(message.type == "UPDATE_DKEY" && ws.type == 1 && message.token == ws.instance.token) {
        ws.instance.Dkey = message.Dkey
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
  console.log(instances)
}, 1000)

setInterval(() => {
  sockets.forEach(ws => {
    ws.send(JSON.stringify({
      "type": "PING",
      "close": false
    }))
    if(Date.now() - ws.lastPong > 7500) {
      wsClosed(ws)
      ws.terminate()
    }
  })
}, 5000)

var wsClosed = (socket) => {
  sockets.forEach((socket2, index) => {
    if(socket == socket2) {
      sockets.splice(index, 1);
    }
  })
  instances.forEach((instance, index) => {
    instance.sockets.forEach((socket2, index2) => {
      if(socket2 == socket) {
        instances[index].sockets.splice(index2, 1);
      }
    })
    if(instance.masterws == socket) {
      instances.splice(index, 1);
    }
  })
}