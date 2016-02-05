var blocmetrics = {
  report: function(event_name) {
    var _bm_event = {
      name: event_name
    };
    var _bm_url = "http://iamkevinlowe-blocmetrics.herokuapp.com/api/events";

    var _bm_request = new XMLHttpRequest();
    _bm_request.open("POST", _bm_url, true);
    _bm_request.setRequestHeader('Content-Type', 'application/json');
    _bm_request.onreadystatechange = function () {
    };
    _bm_request.send(JSON.stringify(_bm_event));
  }
};