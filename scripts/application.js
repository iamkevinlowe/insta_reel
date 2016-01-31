(function() {
  var currentMediaIndex = 0;
  var interval = null;
  var mediaItems = [];
  var minTagId = null;
  var nextUrl = null;
  var socket = io();
  var subscriptionId = null;
  var tag = null;

  const INTERVAL_TIME = 5000;
  const MAX_IMAGES = 100;

  const IG_FORM = document.getElementById('ig_form');
  const IG_TAG_INPUT = document.getElementById('tag_input');
  const IG_IMAGE_CONTAINER = document.getElementById('ig_image_container');
  const IG_IMAGE = document.getElementById('ig_image');
  const IG_CAPTION = document.getElementById('ig_caption');
  const IG_USER = document.getElementById('ig_user');

  IG_FORM.addEventListener('submit', function(e) {
    e.preventDefault();

    if (interval) {
      clearInterval(interval);
      socket.emit('delete subscription', subscriptionId);
      interval = minTagId = nextUrl = subscriptionId = tag = null;
      mediaItems = [];
      currentMediaIndex = 0;
    }

    tag = IG_TAG_INPUT.value;

    if (tag) {
      getImages();
      makeSubscription();    
    } else {
      IG_IMAGE.style.opacity = IG_CAPTION.style.opacity = IG_USER.style.opacity = 0;
    }
  });

  IG_IMAGE_CONTAINER.addEventListener('click', function(e) {
    if (this.requestFullScreen) {
      this.requestFullScreen();
    } else if (this.msRequestFullscreen) {
      this.msRequestFullscreen();
    } else if (this.mozRequestFullScreen) {
      this.mozRequestFullScreen();
    } else if (this.webkitRequestFullscreen) {
      this.webkitRequestFullscreen();
    }
  });

  socket.on('new images', function(response) {
    getImages(null, minTagId)
  });

  window.onbeforeunload = function() {
    socket.emit('delete subscription', subscriptionId)
  };

  function getImages(url, minId) {
    var queryString = "?tag=" + tag;
    if (url) queryString += "&url=" + url;
    if (minId) queryString += "&minTagId=" + minId;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/images' + queryString);
    xhr.onload = function() {
      if (xhr.status === 200) {
        var response = JSON.parse(xhr.response);
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
          interval = setInterval(showNextMediaItem, INTERVAL_TIME);
        }
      }
    };
    xhr.send();
  }

  function makeSubscription() {
    var queryString = "?tag=" + tag;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/subscribe' + queryString);
    xhr.onload = function() {
      if (xhr.status === 200) {
        var response = JSON.parse(xhr.response);
        if (response.data) subscriptionId = response.data.id;
      }
    };
    xhr.send();
  }

  function showNextMediaItem() {
    if (currentMediaIndex < mediaItems.length) showItemAtIndex(currentMediaIndex++);

    if (currentMediaIndex == MAX_IMAGES) {
      mediaItems.sort(createdTime);
      mediaItems.splice(MAX_IMAGES);
      currentMediaIndex = 0;
    } else if (currentMediaIndex == mediaItems.length - 1) {
      getImages(nextUrl);
    }
  }

  function showItemAtIndex(index) {
    var mediaItem = mediaItems[index];

    IG_IMAGE.style.opacity = IG_CAPTION.style.opacity = IG_USER.style.opacity = 0;
    setTimeout(function() {
      IG_IMAGE.setAttribute('src', mediaItem.url);
      IG_CAPTION.textContent = mediaItem.caption;
      IG_USER.textContent = mediaItem.user;
      IG_IMAGE.onload = function() {
        IG_IMAGE.style.opacity = IG_CAPTION.style.opacity = IG_USER.style.opacity = 1;
      }
    }, 1000);
  }

  function createdTime(a, b) {
    return a.created_time > b.created_time ? -1 : a.created_time < b.created_time ? 1 : 0;
  }
})();