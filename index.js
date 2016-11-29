const express = require('express');
const fetch = require('node-fetch');
const fs = require('mz/fs');
const sources = augmentSourcesSet(require('./sources.json'));

const app = express();

app.get('/sources', (req, res) => {
  sources.then(s => res.send(s));
});

app.get('/generate', (req, res) => {

});

app.use(express.static('static'));

require('http').createServer(app).listen(8080);

// Lol
oldDelete = Set.prototype.delete;
Set.prototype.delete = function(item) {
  oldDelete.call(this, item);
  return this;
}

function augmentSourcesSet(sources) {
  return Promise.all(
    sources.map(s => {
      if (s.uri.startsWith('http://') || s.uri.startsWith('https://'))
        return fetch(s.uri, {method: 'HEAD'})
          .then(response => {
            s.size = response.headers.get('Content-Length');
            s.etag = response.headers.get('ETag');
          });
      else 
        return fs.stat(s.uri)
          .then(stats => {
            s.size = stats.size;
          });
    })
  )
  .then(_ => ({
    sources,
    videoTags: Array.from(
      Array.prototype.concat.apply([], sources.map(s => s.tags).filter(s => s.indexOf('video') !== -1))
        .reduce((acc, tag) => acc.add(tag), new Set()).delete('video')
    ),
    audioTags: Array.from(
      Array.prototype.concat.apply([], sources.map(s => s.tags).filter(s => s.indexOf('audio') !== -1))
        .reduce((acc, tag) => acc.add(tag), new Set()).delete('audio')
    )
  }))
  .catch(err => console.log(`Error: ${err.toString()}`));
}