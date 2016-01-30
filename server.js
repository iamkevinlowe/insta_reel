var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');

const VERIFY_TOKEN = Math.random().toString(36).substring(2);

app.set('port', process.env.PORT || 3000);
app.use(express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/scripts'));

app.get('/', (req, res) => res.sendFile(__dirname + '/views/index.html'));

app.get('/images', function(req, res) {
  var url = req.query.url ? req.query.url : process.env.INSTAGRAM_URL + '/tags/' + req.query.tag + '/media/recent?client_id=' + process.env.INSTAGRAM_CLIENT_ID;
  if (req.query.minTagId) url += '&min_tag_id=' + req.query.minTagId;
  request.get(url, (error, response, body) => error ? console.error('Error: ', error) : res.send(body));
});

app.get('/subscribe', function(req, res) {
  var formData = {
    object: 'tag',
    object_id: req.query.tag,
    aspect: 'media',
    // callback_url: 'https://2f0344ee.ngrok.com/callback',
    callback_url: 'https://real-time-reel.herokuapp.com/callback',
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
    verify_token: VERIFY_TOKEN
  };

  request.post({
    url: process.env.INSTAGRAM_URL + '/subscriptions',
    formData: formData
  }, (error, response, body) => error ? res.send(err) : res.send(body));
});

app.get('/callback', function(req, res) {
  if (req.query['hub.mode'] == 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  }
});

app.post('/callback', function(req, res) {
  io.emit('new images', {});
  res.send({});
});

io.on('connection', function(socket) {
  socket.on('new images', response => io.emit('new images', response));
  socket.on('delete subscription', id => request.del(process.env.INSTAGRAM_URL + '/subscriptions?client_id=' + process.env.INSTAGRAM_CLIENT_ID + '&client_secret=' + process.env.INSTAGRAM_CLIENT_SECRET + '&id=' + id));
});

http.listen(app.get('port'), () => console.log('listening on *:' + app.get('port')));