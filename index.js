const express = require('express');
const fetch = require('node-fetch');
const fs = require('mz/fs');
const exec = require('mz/child_process').exec;
const url = require('url');
const path = require('path');
const process = require('process');
const sources = augmentSourcesSet(require('./sources.json'));

const app = express();

app.get('/sources', (req, res) => {
  sources.then(s => res.send(s));
});

app.get('/generate', (req, res) => {
  console.log(`Starting video processing...`);
  const videoPath = new url.parse(req.query['Video']);
  videoPath.flatPath = path.join('data', videoPath.pathname.replace(/\//g, '_'));
  const audioPath = new url.parse(req.query['Audio']);
  audioPath.flatPath = path.join('data', audioPath.pathname.replace(/\//g, '_'));

  console.log(`${videoPath.flatPath}, ${audioPath.flatPath}`);
  console.log(`${videoPath.href}, ${audioPath.href}`);

  Promise.all([
    fs.stat(videoPath.flatPath)
      .catch(err => {
        console.log('Downloading video file...');
        return fetch(videoPath.href)
          .then(resp => new Promise(resolve => {
            resp.body.pipe(fs.createWriteStream(videoPath.flatPath));
            resp.body.on('end', resolve);
          }))
          .then(_ => console.log('Video download done.'));
      }),
    fs.stat(audioPath.flatPath)
      .catch(err => {
        console.log('Downloading audio file...');
        return fetch(audioPath.href)
          .then(resp => new Promise(resolve => {
            resp.body.pipe(fs.createWriteStream(audioPath.flatPath));
            resp.body.on('end', resolve);
          }))
          .then(_ => console.log('Audio download done.'));
      }),
  ])
  .then(_ => {
    console.log('Encoding...');
    return exec(`ffmpeg -y -i "${videoPath.flatPath}" -i "${audioPath.flatPath}" -c copy -map 0:v -map 1:a output.${req.query['Format']}`);
  })
  .then((stdout, stderr) => console.log(`Succesfully wrote "output.${req.query['Format']}"`))
  .catch(err => console.log(`Encoding error: ${err.toString()}`));
  res.send();
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
        return fs.stat(`data/${s.uri}`)
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