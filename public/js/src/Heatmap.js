/**
 * Heatmap
 *
 * @constructor
 */ 
var Heatmap = function(map){
    
    // Google Maps properties
    this._map = map;
    this.setMap(map);
    
    // Set Heatmap drawing defaults
    this.setRadius(Heatmap.DEFAULT_RADIUS);
    this.setHeatMultiplier(Heatmap.DEFAULT_ALPHA_MULTIPLIER);
    
    // Initialize hotspost array
    this._hotspots = [];
    console.log('heatmap ready');
};

/**
 * Set the object rototype to Google maps Overlay View
 */
Heatmap.prototype = new google.maps.OverlayView();

/**
 * Creates the canvas element etc
 * Called automatically by Google Maps when layer is added to a map
 */
Heatmap.prototype.onAdd = function() {
  this._canvas = document.createElement('canvas');
  this._ctx = this._canvas.getContext("2d");

  // Add canvas as a layer to overlay level
  var panes = this.getPanes();
  panes.overlayLayer.appendChild(this._canvas);
  
  // Inherit dimensions from map container element
  this._canvas.width  = document.getElementById('map_container').offsetWidth;
  this._canvas.height = document.getElementById('map_container').offsetHeight;
  this._width = this._canvas.width;
  this._height = this._canvas.height;
  log("Canvas size:" + this._width + " x " + this._height);
  
  // Set position
  this._canvas.style.position = "absolute";
  this._canvas.style.left = 0;
  this._canvas.style.top = 0;
  
  // Set listener to redraw canvas every time user ends dragging of map
  google.maps.event.addListener(this._map, 'dragend', function(event) {
    heatmap.draw();
  });
};

/**
 * Updates the whole heatmap. This should be done when ever new data
 * comes to the frontend server
 */
Heatmap.prototype.draw = function(){
  log("Heatmap.draw");
  
  // Move the canvas to topleft corner of the map
  var overlayProjection = this.getProjection();
  var start = new Date().getTime();

  var mapBounds = this._map.getBounds();
  if (mapBounds) {
  var sw = overlayProjection.fromLatLngToDivPixel(mapBounds.getSouthWest());
  var ne = overlayProjection.fromLatLngToDivPixel(mapBounds.getNorthEast());
  this._canvas.style.left = sw.x + 'px';
  this._canvas.style.top = ne.y + 'px';
  log("left:" + sw.x + " top:" + ne.y);
  
    // Clear canvas
    var width = this._width;
    var height = this._height;
    this._ctx.clearRect(0, 0, width, height);
    
    var hotspots = this._hotspots;
    var hotspotLength = hotspots.length;
    
    // Draw hotspots to map
    for (var i = 0; i < hotspotLength; i++) {
        var hotspot = hotspots[i];
        var point = MapHelper.fromLatLngToPixel(hotspot.latlng, this._map);
        var amount = hotspot.count;

        for (var j = 0; j < amount; j++) {
          this.addHeat(point.x, point.y);
        }
    }
    
    // Colorize
    this.colorize();
  } else {
    console.warn('mapBounds are not ready');
  }
};

Heatmap.prototype.addHotspot = function(latlng,count){
    this._hotspots.push({
        latlng: latlng,
        count: count
    });
};

/**
 * Add some heat to the map to the given point
 *
 * @private
 *
 * @param {number} x
 * @param {number} y
 */
Heatmap.prototype.addHeat = function(x, y){
    // storing the variables because they will be often used
    var r1 = this._radius1;
    var r2 = this._radius2;
    var ctx = this._ctx;
    
    var multiplier = this._heatMultiplier || 1;
    var hotspotHeat = 0.1;
    var totalHeat = hotspotHeat * multiplier;
    
    // create a radial gradient with the defined parameters. we want to draw an alphamap
    var rgr = ctx.createRadialGradient(x, y, r1, x, y, r2);
    // the center of the radial gradient has .1 alpha value
    rgr.addColorStop(0, 'rgba(0,0,0,' + totalHeat +')');
    rgr.addColorStop(1, 'rgba(0,0,0,0)');
    
    // drawing the gradient
    ctx.fillStyle = rgr;
    ctx.fillRect(x - r2, y - r2, 2 * r2, 2 * r2);
};

/**
 * Colorize the map
 */
Heatmap.prototype.colorize = function(){
    var width = this._width;
    var height = this._height;
    var ctx = this._ctx;

    // get the image data for the mouse movement area
    var image = ctx.getImageData(0, 0, width, height), // some performance tweaks
 imageData = image.data, length = imageData.length;
    // loop thru the area
    for (var i = 3; i < length; i += 4) {
    
        var r = 0, g = 0, b = 0, tmp = 0, // [0] -> r, [1] -> g, [2] -> b, [3] -> alpha
 alpha = imageData[i];
        
        // coloring depending on the current alpha value
        if (alpha <= 255 && alpha >= 235) {
          tmp = 255 - alpha;
          r = 255 - tmp;
          g = tmp * 12;
        }
        else 
          if (alpha <= 234 && alpha >= 200) {
            tmp = 234 - alpha;
            r = 255 - (tmp * 8);
            g = 255;
          }
          else 
            if (alpha <= 199 && alpha >= 150) {
              tmp = 199 - alpha;
              g = 255;
              b = tmp * 5;
            }
            else 
              if (alpha <= 149 && alpha >= 100) {
                tmp = 149 - alpha;
                g = 255 - (tmp * 5);
                b = 255;
              }
              else {
                b = 255;
              }
        // we ve started with i=3
        // set the new r, g and b values
        imageData[i - 3] = r;
        imageData[i - 2] = g;
        imageData[i - 1] = b;
    }
    // the rgb data manipulation didn't affect the ImageData object(defined on the top)
    // after the manipulation process we have to set the manipulated data to the ImageData object
    image.data = imageData;
    ctx.putImageData(image, 0, 0);
};

/**
 * @const
 * @type {number}
 */
Heatmap.DEFAULT_RADIUS = 40;

/**
 * @const
 * @type {number}
 */
Heatmap.DEFAULT_ALPHA_MULTIPLIER = 1;

/**
 * Change the hotspot radius
 * 
 * @param {number} r new radius
 */
Heatmap.prototype.setRadius = function(r) {
  this._radius2 = r;
  this._radius1 = r / 2;
};

Heatmap.prototype.setHeatMultiplier = function(multiplier) {
  this._heatMultiplier = multiplier;
};