const express = require('express');
const fetch = require('node-fetch');
const sources = augmentSourcesSet(require('./sources.json'));

const app = express();

  app.get('/sources', (req, res) => {
  sources.then(s => {
    res.send(s);
  });
});

require('http').createServer(app).listen(8080);

function augmentSourcesSet(sources) {
  return Promise.all(
    sources.map(s => 
      fetch(s.url, {method: 'HEAD'})
        .then(response => {
          s.size = response.headers.get('Content-Length');
        })
        .catch(err => console.log(`Error: ${err.toString()}`))
    )
  ).then(_ => ({
    sources,
    tags: Array.from(
      Array.prototype.concat.apply([], sources.map(s => s.tags))
        .reduce((acc, tag) => acc.add(tag), new Set())
    )
  }));
}