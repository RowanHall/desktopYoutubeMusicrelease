var request = require('request');
const fs = require('fs');
request('http://98.7.203.224:42125/getLatestVersion', function (error, response, body) {
  if(body != fs.readFileSync("./version.txt", 'utf-8')) {
    console.log(body, fs.readFileSync("./version.txt", 'utf-8'))
    var pipe = request('http://98.7.203.224:42125/getUpdateZip').pipe(fs.createWriteStream("./update.zip"))
    pipe.on('finish', () => {
      console.log("UPDATE FINISHED")
      require('./index.js')
    })
  } else {
    console.log("NO UPDATE NEEDED")
    require('./index.js')
  }
});