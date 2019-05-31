window.onload =() => {
  try {
    debugger;
  document.getElementsByClassName('center-content style-scope ytmusic-nav-bar')[0].style.webkitAppRegion = "drag"
  document.getElementsByClassName('right-content style-scope ytmusic-nav-bar')[0].style.webkitAppRegion = 'no-drag'
  document.getElementsByClassName('style-scope ytmusic-nav-bar')[7].style.webkitAppRegion = 'no-drag'
  document.getElementsByClassName('style-scope ytmusic-nav-bar')[8].style.webkitAppRegion = 'no-drag'
  var my_awesome_script = document.createElement('script');

  my_awesome_script.setAttribute('src',"https://cdn.jsdelivr.net/npm/sweetalert2@8");

  document.head.appendChild(my_awesome_script);
  const { remote } = require('electron')
  const ipc = require('electron').ipcRenderer
  var oldwatching = {};
  var injectedSettings = false;
  var oldviewing
  var plugins;
  var overrideviewtimer = false;
  window.songStart = Date.now();
  window.inGroup = false;
  ipc.send('pageload')
  setInterval(() => {
    try {
      var gawatching = window._ga_.navigator.playerController.playerApi.getPlayerResponse().videoDetails
    } catch(e) {
      var gawatching = {};
    }
    try {
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
    if(watching.authors == []) {
      watching.authors = watching.album;
      watching.album = {}
    }

    watching.meta = {}
    watching.meta.inFocus = document.hasFocus()
    var timestr = document.getElementsByClassName('time-info style-scope ytmusic-player-bar')[0].innerText.split(" / ")
    watching.time = {};
    watching.time.watched = _ga_.playerController.playerApi.getCurrentTime()
    watching.time.length = _ga_.playerController.playerApi.getDuration()

    if(inGroup && !overrideviewtimer && Math.abs(Date.now() - (songStart + (watching.time.watched * 1000))) > 150) {
      console.log(Math.abs(Date.now() - (songStart + (watching.time.watched * 1000))))
      _ga_.playerController.playerApi.seekTo((Date.now() - songStart) / 1000)
    }

    ipc.send('gawatchingUpdate', JSON.stringify(gawatching))
    ipc.send('watchingUpdate', JSON.stringify(watching))
    ipc.send('locupdate', document.location.href)
    ipc.send('pausedupdate', (!(document.getElementById('play-pause-button').title.toLowerCase() == 'pause')))
  } catch(err) {}
    ipc.send('accountDetails', JSON.stringify(yt.config_.ACCOUNTS))
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


  var joinRequest = (user, userraw) => {
    Swal.fire({
      title: `${user} wants to join you`,
      text: `You and ${user} will have your music synced with you as the master and them as the client. While connected, when you change songs ${user} will automaitally have their song changed to match.\n\n(play/pause and scrubbing are also synced.)`,
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Accept',
      cancelButtonText: 'Reject',
      reverseButtons: false
    }).then((result) => {
      if (result.value) {
        Swal.fire(
          'Accepted!',
          `${user} will start listening with you shortly.`,
          'success'
        );
        ipc.send('ipcacception', userraw)
      } else if (
        true
      ) {
        Swal.fire(
          'Rejected.',
          `Your rejected ${user}'s invite.`,
          'error'
        );
        ipc.send('ipcrejection', userraw)
      }
    })
  }
}

