(function() {
  var instagram = {
    currentMediaIndex: 0,
    mediaItems: []
  };

  var socket = io();

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

    if (instagram.interval) resetSlideshow();

    instagram.tag = IG_TAG_INPUT.value;

    if (instagram.tag) {
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

  socket.on('incoming', function(response) {
    if (response.object_id === instagram.tag && response.subscription_id === instagram.subscriptionId) {
      getImages(null, instagram.minTagId);
    }
  });

  window.onbeforeunload = function() {
    socket.emit('delete subscription', instagram.subscriptionId);
  };

  function getImages(maxId, minId) {
    var queryString = "?tag=" + instagram.tag;
    if (maxId) queryString += "&maxTagId=" + maxId;
    if (minId) queryString += "&minTagId=" + minId;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/images' + queryString);
    xhr.onload = function() {
      if (xhr.status === 200) {
        var response = JSON.parse(xhr.response);
        if (response.data.length > 0) insertMedia(response);        
      }
    };
    xhr.send();
  }

  function makeSubscription() {
    var queryString = "?tag=" + instagram.tag;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/subscribe' + queryString);
    xhr.onload = function() {
      if (xhr.status === 200) {
        var response = JSON.parse(xhr.response);
        if (response.data) instagram.subscriptionId = parseInt(response.data.id);
      }
    };
    xhr.send();

    blocmetrics.report('Subscription made')
  }

  function showNextMediaItem() {
    if (instagram.currentMediaIndex < instagram.mediaItems.length) showItemAtIndex(instagram.currentMediaIndex++);

    if (instagram.currentMediaIndex == MAX_IMAGES) {
      instagram.mediaItems.sort(createdTime);
      instagram.mediaItems.splice(MAX_IMAGES);
      instagram.currentMediaIndex = 0;
    } else if (instagram.currentMediaIndex == instagram.mediaItems.length - 1) {
      getImages(instagram.maxTagId);
    }
  }

  function showItemAtIndex(index) {
    var mediaItem = instagram.mediaItems[index];

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

  function insertMedia(response) {
    var newMediaItems = response.data.map(function(obj) {
      return {
        caption: obj.caption ? obj.caption.text : '',
        url: obj.images.standard_resolution.url,
        user: obj.user.username,
        created_time: obj.created_time
      };
    });
    
    if (response.pagination.next_max_tag_id) {
      instagram.mediaItems = instagram.mediaItems.concat(newMediaItems);
      instagram.maxTagId = response.pagination.next_max_tag_id;
      if (!instagram.minTagId) instagram.minTagId = response.pagination.min_tag_id;
    } else {
      instagram.mediaItems = instagram.mediaItems.splice(0, instagram.currentMediaIndex).concat(newMediaItems).concat(instagram.mediaItems);
      instagram.minTagId = response.pagination.min_tag_id;
    }

    if (!instagram.interval) {
      showNextMediaItem();
      instagram.interval = setInterval(showNextMediaItem, INTERVAL_TIME);
    }
  }

  function resetSlideshow() {
    clearInterval(instagram.interval);
    socket.emit('delete subscription', instagram.subscriptionId);
    instagram = {
      currentMediaIndex: 0,
      mediaItems: []
    };
  }

  function createdTime(a, b) {
    return a.created_time > b.created_time ? -1 : a.created_time < b.created_time ? 1 : 0;
  }
})();