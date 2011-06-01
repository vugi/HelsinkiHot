

var LabelOverlay = function(map) {
    // Google Maps properties
    this._map = map;
    this.setMap(map);
};

LabelOverlay.prototype = new google.maps.OverlayView();

LabelOverlay.prototype.addLabel = function(venue) {
  var name = venue.name;
  var events = venue.events; // array of objects {points, time, type}
  var latitude = venue.latitude;
  var longitude = venue.longitude;
  
  var overlayProjection = this.getProjection();
  var point = overlayProjection.fromLatLngToDivPixel(new google.maps.LatLng(latitude, longitude));
  
  console.log(name + " x: " + point.x + ", y: " + point.y);
  console.log(point);
  
  var labelLeft = (point.x - this._left);
  var labelTop = (point.y - this._top);
  
  var $label = $('<div class="label-overlay" style="position: absolute;">' + name + '</div>');
  $label.css({left: labelLeft, top: (labelTop - 100), opacity: 0});
  
  this.$div.append($label);
  
  $label.animate({
    opacity: 1,
    top: '+=100'
  }, 1000);
  
  setTimeout(function() {
    $label.animate({
      opacity: 0
    }, 1000, function() {
      $label.remove();
    });
  }, 5000);
};

LabelOverlay.prototype.onAdd = function() {
  this.$div = $('<div></div>');
  this._div = this.$div.get(0);
  // Add canvas as a layer to overlay level
  var panes = this.getPanes();
  panes.overlayLayer.appendChild(this._div);
  
  // Set position
  this._div.style.position = "absolute";
  
  var overlayProjection = this.getProjection();
  var nw = overlayProjection.fromLatLngToDivPixel(new google.maps.LatLng(60.255486, 24.729538));
  var se = overlayProjection.fromLatLngToDivPixel(new google.maps.LatLng(60.129880, 25.089684));
  
  this._div.style.left = nw.x + 'px';
  this._div.style.top = nw.y + 'px';
  this._div.style.width = se.x - nw.x + 'px';
  this._div.style.height = se.y - nw.y + 'px';
  
  this._left = nw.x;
  this._top = nw.y;
};

LabelOverlay.prototype.draw = function() {
  var overlayProjection = this.getProjection();
  var nw = overlayProjection.fromLatLngToDivPixel(new google.maps.LatLng(60.255486, 24.729538));
  var se = overlayProjection.fromLatLngToDivPixel(new google.maps.LatLng(60.129880, 25.089684));
  
  this._div.style.left = nw.x + 'px';
  this._div.style.top = nw.y + 'px';
  this._div.style.width = se.x - nw.x + 'px';
  this._div.style.height = se.y - nw.y + 'px';
  
  this._left = nw.x;
  this._top = nw.y;
};

LabelOverlay.prototype.onRemove = function() {
  // Implement this if needed.
};