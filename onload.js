document.getElementsByClassName('left-content style-scope ytmusic-nav-bar')[0].style.webkitAppRegion = "drag"
var isCreated = false;
document.body.addEventListener('DOMSubtreeModified', () => {
  if(!isCreated && document.getElementsByTagName('ytmusic-dialog').length == 1) {
    isCreated = true
    modSettings()
  }
})
var modSettings = () => {
  
}