const { app, BrowserWindow, ipcMain } = require('electron')
const globalData = {};
module.exports = {
  "initialize": () => {

    function createWindow () {
      // Create the browser window.
      let win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: true
        }
      })
      // and load the index.html of the app.
      win.loadFile(__dirname + '/musicShare.html')
      globalData.win = win
    }

    app.on('ready', createWindow)
    return app;
  },
  "NEW_USER": (userObject) => {
    ipcMain.
  },
  "REMOVE_USER": (userObject) => {
    
  },
  "SET_INFO": (infoObject) => {
    
  },
  "GET_WINDOW": () => {
    return globalData.win
  }
}