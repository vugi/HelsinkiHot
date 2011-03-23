/**
 * Loads data from API and displays it.
 */

var map;
var heatmap;
var defaultRadius = 40;
var multiply = 2;

$(document).ready(function(){
	initializeMap();
	initializeHeatmap();
	
	/* Foursquare */
	$.ajax({
		type: "GET",
		url: "api/venues",
   		success: function(jsonData){
			console.log(jsonData);
			showForsquareData(jsonData);
		}
	});
  
  $("#radiusSlider").slider({
    min: 5, 
    max: 100,
    value: defaultRadius, 
    range: "min", 
    slide: function( event, ui ) {
      heatmap.setRadius(ui.value);
      heatmap.update();
  }});
  
  $("#multiplySlider").slider({
    min: 0, 
    max: 10,
    value: multiply,
    range: "min", 
    slide: function( event, ui ) {
      
      multiply = ui.value;
      console.log(multiply);
      heatmap.update();
  }});
});

function showForsquareData(jsonData){
	$("<h3>Foursquare Trending</h3>").appendTo('#sidebar');
	var list = $('<ol>').appendTo('#sidebar');
	$(jsonData).each(function(i,item){		
		// List item
		$('<li>').html(item.name+' '+item.hereNow.count+'/'+item.stats.checkinsCount).appendTo(list);
		
		// Google maps Info Window
		var infowindow = new google.maps.InfoWindow({
		    content: item.name+'<br/>now: '+item.hereNow.count+'<br/>total: '+item.stats.checkinsCount
		});
		
		// Google maps marker
		var latlng = new google.maps.LatLng(item.location.lat,item.location.lng);
		var marker = new google.maps.Marker({
		      position: latlng, 
		      map: map, 
		      title: item.name,
			icon: 'https://chart.googleapis.com/chart?chst=d_map_pin_letter_withshadow&chld='+item.hereNow.count+'|C6E7DE|000000'
		});
		
		drawPoint(latlng,item.hereNow.count);
				
		google.maps.event.addListener(marker, 'mouseover', function() {
		  infowindow.open(map,marker);
		});
		google.maps.event.addListener(marker, 'mouseout', function() {
		  infowindow.close();
		});
	});
	
	heatmap.update();	
}

function initializeMap() {
    var latlng = new google.maps.LatLng(60.180833,24.9375);
    var myOptions = {
      zoom: 12,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);
  }
  
function initializeHeatmap() {
	heatmap = new Heatmap(document.getElementById('canvas'));
}

function drawPoint(latlng,count) {
  // http://stackoverflow.com/questions/2674392/how-to-access-google-maps-api-v3-markers-div-and-its-pixel-position
  var scale = Math.pow(2, map.getZoom());
  var nw = new google.maps.LatLng(
    map.getBounds().getNorthEast().lat(),
    map.getBounds().getSouthWest().lng()
  );
  var worldCoordinateNW = map.getProjection().fromLatLngToPoint(nw);
  var worldCoordinate = map.getProjection().fromLatLngToPoint(latlng);
  var pixelOffset = new google.maps.Point(
    Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale),
    Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale)
  );

  // var point = map.getProjection().fromLatLngToPoint(latlng);
  var x = pixelOffset.x;
  var y = pixelOffset.y;
  
  console.log(x,y);
  for (i=0;i<count;i++){
    heatmap.addHotspot(x, y);
  }
  
  
}