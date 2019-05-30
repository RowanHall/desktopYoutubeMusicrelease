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