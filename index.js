const express = require('express');
const fetch = require('node-fetch');
const fs = require('mz/fs');
const sources = augmentSourcesSet(require('./sources.json'));

const app = express();

app.get('/sources', (req, res) => {
  sources.then(s => res.send(s));
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
      if (s.url)
        return fetch(s.url, {method: 'HEAD'})
          .then(response => {
            s.size = response.headers.get('Content-Length');
          });
      else if (s.file)
        return fs.stat(s.file)
          .then(stats => {
            s.size = stats.size;
          });
      else
        throw new Error(`No usable source for ${s.name} with ${s.tags}`);
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