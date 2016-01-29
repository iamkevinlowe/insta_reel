var express = require('express');
var app = express();
var http = require('http').Server(app);
var request = require('request');
var io = require('socket.io')(http);

const VerifyToken = Math.random().toString(36).substring(2);
const ClientId = '7e6016221ad8419cb00c414709dbfb82';
const ClientSecret = '8557d75272ef4bacac58bfebda9327f9';

app.use(express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/scripts'));

app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  next();
});

app.get('/', (req, res) => res.sendFile(__dirname + '/views/index.html'));

app.get('/images', function(req, res) {
  var url = req.query.url ? req.query.url : 'https://api.instagram.com/v1/tags/' + req.query.tag + '/media/recent?client_id=' + ClientId;
  if (req.query.minTagId) url += '&min_tag_id=' + req.query.minTagId;
  request.get(url, (error, response, body) => error ? console.error('Error: ', error) : res.send(body));
});

app.get('/subscribe', function(req, res) {
  var formData = {
    object: 'tag',
    object_id: req.query.tag,
    aspect: 'media',
    callback_url: 'https://2f0344ee.ngrok.com/callback',
    client_id: ClientId,
    client_secret: ClientSecret,
    verify_token: VerifyToken
  };

  request.post({
    url: 'https://api.instagram.com/v1/subscriptions',
    formData: formData
  }, (error, response, body) => error ? res.send(err) : res.send(body));
});

app.get('/callback', function(req, res) {
  if (req.query['hub.mode'] == 'subscribe' && req.query['hub.verify_token'] === VerifyToken) {
    res.send(req.query['hub.challenge']);
  }
});

app.post('/callback', function(req, res) {
  io.emit('new images', {});
  res.send({});
});

io.on('connection', function(socket) {
  socket.on('new images', response => io.emit('new images', response));
  socket.on('delete subscription', id => request.del('https://api.instagram.com/v1/subscriptions?client_id=' + ClientId + '&client_secret=' + ClientSecret + '&id=' + id));
});

http.listen(3000, () => console.log('listening on *:3000'));