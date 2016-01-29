var currentMediaIndex = 0;
var interval = null;
var mediaItems = [];
var minTagId = null;
var nextUrl = null;
var socket = io();
var subscriptionId = null;
var tag = null;

const IntervalTime = 5000;
const MaxImages = 100;

$('form').submit(function () {
  if (interval) {
    clearInterval(interval);
    socket.emit('delete subscription', subscriptionId);
    interval = minTagId = nextUrl = subscriptionId = tag = null;
    mediaItems = [];
    currentMediaIndex = 0;
  }

  tag = $('#hash_input').val();

  getImages();
  makeSubscription();

  return false;
});

socket.on('new images', response => { getImages(null, minTagId) });

$(window).bind('beforeunload', () => { socket.emit('delete subscription', subscriptionId) });

function getImages(url, minId) {
  var data = {tag: tag};
  if (url) data.url = url;
  if (minId) data.minTagId = minId;

  $.getJSON('https://2f0344ee.ngrok.com/images', data, function(response) {
    var newMediaItems = response.data.map(function(obj) {
      return {
        caption: obj.caption.text,
        url: obj.images.standard_resolution.url,
        user: obj.user.username,
        created_time: obj.created_time
      };
    });

    if (response.pagination.next_url) {
      mediaItems = mediaItems.concat(newMediaItems);
      nextUrl = response.pagination.next_url;
    } else {
      mediaItems = mediaItems.splice(0, currentMediaIndex).concat(newMediaItems).concat(mediaItems);
    }

    minTagId = response.pagination.min_tag_id;

    if (interval == null) {
      showNextMediaItem();
      interval = setInterval(showNextMediaItem, IntervalTime);
    }
  });
}

function makeSubscription() {
  var data = {tag: tag};
  $.getJSON('https://2f0344ee.ngrok.com/subscribe', data, response => subscriptionId = response.data.id);
}

function showNextMediaItem() {
  if (currentMediaIndex < mediaItems.length) {
    showItemAtIndex(currentMediaIndex++);
  }

  if (currentMediaIndex == MaxImages) {
    mediaItems.sort(createdTime);
    currentMediaIndex = 0;
  } else if (currentMediaIndex == mediaItems.length - 1) {
    getImages(nextUrl);
  }
}

function showItemAtIndex(index) {
  var mediaItem = mediaItems[index];
  $('#js-photo').fadeOut('slow', function() {
    $(this).empty().append('<img src=' + mediaItem.url + '>');
  }).fadeIn('slow');

  $('#js-text').fadeOut('slow', function() {
    $(this).empty().append('<p>' + mediaItem.caption + '</p> <small>' + mediaItem.user + '</small>');
  }).fadeIn('slow');
}

function createdTime(a, b) {
  return a.created_time > b.created_time ? -1 : a.created_time < b.created_time ? 1 : 0;
}