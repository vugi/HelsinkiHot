/**
 * Heatmap
 * 
 * @constructor
 */
var Heatmap = function(canvasElement) {
	this._canvas = canvasElement;
	this._ctx = canvasElement.getContext("2d"); 
	this._width = canvasElement.width;
	this._height = canvasElement.height;
	
	// Radius?
	this._radius1 = 20;
	this._radius2 = 40; 
	
	// Initialize mouse handler
	var that = this;
	var handler = this.mouseClickHandler
	this._canvas["onclick"] = function(ev){ handler(ev, that); };  
};

/**
 * Updates the whole heatmap. This should be done when ever new data 
 * comes to the frontend server
 */
Heatmap.prototype.update = function() {
	
};

Heatmap.prototype.colorize = function(x, y, x2) {
	var width = this._width;
	var height = this._height;
	var ctx = this._ctx;
	 
    // initial check if x and y is outside the app
    // -> resetting values
    if (x + x2 > width) 
        x = width - x2;
    if (x < 0) 
        x = 0;
    if (y < 0) 
        y = 0;
    if (y + x2 > height) 
        y = height - x2;
    // get the image data for the mouse movement area
    var image = ctx.getImageData(x, y, x2, x2), // some performance tweaks
    imageData = image.data, length = imageData.length;
    // loop thru the area
    for (var i = 3; i < length; i += 4) {
    
        var r = 0, g = 0, b = 0, tmp = 0,    // [0] -> r, [1] -> g, [2] -> b, [3] -> alpha
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
    ctx.putImageData(image, x, y);
};

Heatmap.prototype.decolorize = function() {
	var width = this._width;
	var height = this._height;
	var ctx = this._ctx;
	var x = 0;
	var y = 0;

    var image = ctx.getImageData(x, y, width, height), // some performance tweaks
    imageData = image.data, length = imageData.length;
    // loop thru the area
    for (var i = 3; i < length; i += 4) {
    
        var r = 0, g = 0, b = 0, tmp = 0,    // [0] -> r, [1] -> g, [2] -> b, [3] -> alpha
        alpha = imageData[i] - 10;
		
		if(alpha > 0) {
			imageData[i] = alpha;
		} else {
			imageData[i] = 0;
		}
        
    }
    // the rgb data manipulation didn't affect the ImageData object(defined on the top)
    // after the manipulation process we have to set the manipulated data to the ImageData object
    image.data = imageData;
    ctx.putImageData(image, x, y);
};

Heatmap.prototype.fade = function(alphaChange) {
	
}

Heatmap.prototype.mouseClickHandler = function(ev, that){
	console.log('Heatmap mouse click');
	
	var colorize = !(ev.altKey);
	if(!colorize){
		return that.decolorize();
	}
	
	// at first we have to get the x and y values of the user's mouse position
    var x, y;
    if (ev.layerX) { // Firefox
        x = ev.layerX;
        y = ev.layerY;
    }
    else 
        if (ev.offsetX) { // Opera
            x = ev.offsetX;
            y = ev.offsetY;
        }
    if (typeof(x) == 'undefined') 
        return;
    
    // storing the variables because they will be often used
    var r1 = that._radius1;
    var r2 = that._radius2;
	var ctx = that._ctx;
    
    //console.log("x: "+x+"; y:" +y);
    // create a radial gradient with the defined parameters. we want to draw an alphamap
    var rgr = ctx.createRadialGradient(x, y, r1, x, y, r2);
    // the center of the radial gradient has .1 alpha value
	rgr.addColorStop(0, 'rgba(0,0,0,0.1)');
	rgr.addColorStop(1, 'rgba(0,0,0,0)');
    
	// drawing the gradient
    ctx.fillStyle = rgr;
    ctx.fillRect(x - r2, y - r2, 2 * r2, 2 * r2);

    // at least colorize the area	
    that.colorize(x - r2, y - r2, 2 * r2);
};