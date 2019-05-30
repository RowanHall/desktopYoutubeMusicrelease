try {
document.getElementsByClassName('center-content style-scope ytmusic-nav-bar')[0].style.webkitAppRegion = "drag"
document.getElementsByClassName('right-content style-scope ytmusic-nav-bar')[0].style.webkitAppRegion = 'no-drag'
document.getElementsByClassName('style-scope ytmusic-nav-bar')[7].style.webkitAppRegion = 'no-drag'
document.getElementsByClassName('style-scope ytmusic-nav-bar')[8].style.webkitAppRegion = 'no-drag'

const { remote } = require('electron')
const ipc = require('electron').ipcRenderer
var oldwatching = {};
var injectedSettings = false;
var oldviewing
var plugins;
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
  watching.time.watched = yt.util.activity.getTimeSinceActive()/1000
  watching.time.length = (parseInt(timestr[1].split(":")[0])*60) + (parseInt(timestr[1].split(":")[1]))
  
  ipc.send('watchingUpdate', JSON.stringify(watching))
  ipc.send('locupdate', document.location.href)
  ipc.send('pausedupdate', (!(document.getElementById('play-pause-button').title.toLowerCase() == 'pause')))
  pluginEvent = (eventName, data) => {
    plugins.forEach(plugin => {
      try {
        plugin[eventName](data)
      } catch(err) {}
    })
  }
}, 10)
}catch(err) {
  alert("ENCOUNTERED ERROR: " + err)
}

var confirmExists = (directory) => {
  var existed = true;
  if (!fs.existsSync(directory)){
    existed = false
    fs.mkdirSync(directory);
  }
  return existed
}

try {
  var fs = require('fs');
  const path = require('path');
  var homepath = path.resolve(process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE)
  confirmExists(path.join(homepath, '.ytmdesktop'))
  confirmExists(path.join(homepath, '.ytmdesktop', 'plugins'))
  plugins = (() => {
    var filelist = fs.readdirSync(path.join(homepath, '.ytmdesktop', 'plugins'))
    var pluginArray = [];
    filelist.forEach(file => {
      var directory = path.join(homepath, '.ytmdesktop', 'plugins', file)
      pluginArray.push(require(directory))
    })
    return pluginArray
  })();
  plugins.forEach(plugin => {
    //init for each plugin
  })
} catch(err) {}