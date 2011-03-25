/**
 * Heatmap
 *
 * @constructor
 */
var Heatmap = function(canvasElement){
    this._canvas = canvasElement;
    this._ctx = canvasElement.getContext("2d");
    
    // Inherit dimensions from parent element
    this._ctx.canvas.width  = this._canvas.parentElement.offsetWidth;
    this._ctx.canvas.height = this._canvas.parentElement.offsetHeight;
    
    this._width = canvasElement.width;
    this._height = canvasElement.height;
    
    console.log("Canvas width:" + this._width);
    
    // Set defaults
    this.setRadius(Heatmap.DEFAULT_RADIUS);
    this.setHeatMultiplier(Heatmap.DEFAULT_ALPHA_MULTIPLIER);
    this.setHotspotMultiplier(Heatmap.DEFAULT_HOTSPOT_MULTIPLIER);
    
    // Initialize hotspost
    this._hotspots = [];
    
    // Initialize mouse handler
    // var that = this;
    // var handler = this.mouseClickHandler
    // this._canvas["onclick"] = function(ev){ handler(ev, that); };  
};

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

Heatmap.prototype.setHotspotMultiplier = function(multiplier) {
  this._hotspotMultiplier = multiplier;
};

/**
 * Updates the whole heatmap. This should be done when ever new data
 * comes to the frontend server
 */
Heatmap.prototype.update = function(){
    // Clear canvas
    var width = this._width;
    var height = this._height;
    this._ctx.clearRect(0, 0, width, height);
    
    var hotspots = this._hotspots;
    var hotspotLength = hotspots.length;
    
    // Add hotspots to map
    for (var i = 0; i < hotspotLength; i++) {
        var hotspot = hotspots[i];
        var hotspotMultiplier = this._hotspotMultiplier || 1;
        for (var j = 0; j < hotspotMultiplier; j++) {
          this.addHeat(hotspot.x, hotspot.y);
        }
    }
    
    // Colorize
    this.colorize();
};

Heatmap.prototype.addHotspot = function(x, y){
    this._hotspots.push({
        x: x,
        y: y
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
                    else 
                        b = 255;
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
 * @const
 * @type {number}
 */
Heatmap.DEFAULT_HOTSPOT_MULTIPLIER = 1;
