const { app, BrowserWindow, ipcMain } = require('electron')
const globalData = {};
var jsexecutewrapper = (func) => {
  return (...args) => {
    globalData.win.webContents.executeJavaScript(`(${String(func)})(${JSON.stringify(args).slice(1,-1)})`)
  }
}
module.exports = {
  "initialize": () => {

    function createWindow () {
      // Create the browser window.
      let win = new BrowserWindow({
        width: 500,
        height: 650,
        webPreferences: {
          nodeIntegration: true
        },
        transparent: true,
        frame:false,
        resizable: false
      })
      // and load the index.html of the app.
      win.loadFile(__dirname + '/musicShare.html')
      globalData.win = win
    }

    app.on('ready', createWindow)
    return app;
  },
  "NEW_USER": (userObject) => {
    console.log("NEW_USER", userObject, globalData.win)
    jsexecutewrapper((userObject) => {
      myEmitter.emit('NEW_USER', userObject)
    })(userObject)
  },
  "REMOVE_USER": (userObject) => {
    console.log("REMOVE_USER", userObject, globalData.win)
    jsexecutewrapper((userObject) => {
      myEmitter.emit('REMOVE_USER', userObject)
    })(userObject)
  },
  "CLEAR": (userObject) => {
    console.log("CLEAR", userObject, globalData.win)
    jsexecutewrapper((userObject) => {
      myEmitter.emit('CLEAR', userObject)
    })(userObject)
  },
  "GET_WINDOW": () => {
    return globalData.win
  }
}