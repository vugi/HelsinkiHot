/**
 * Loads data from API and displays it.
 */

var map;
var flickrUrl = "http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=a5b851fbba1fc03339411db4695d84e8&lat=60.170833&lon=24.9375&sort=date-taken-desc&radius=10&extras=date_taken,geo,url_s,url_sq&min_taken_date=2011-03-12&max_taken_date=2011-03-13&format=json&jsoncallback=?";

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
	
	/* Flickr */
	$.getJSON(flickrUrl,function(data){
		console.log(data);
		showFlickrData(data);
	});
});

function showFlickrData(jsonData){
	//$("<h3>Flickr images from today</h3>").appendTo('#sidebar');
	$(jsonData.photos.photo).each(function(i,item){	
		// Sidebar item
		//$('<img src="'+item.url_sq+'" />').appendTo('#sidebar');
		
		// Google maps Info Window
		var infowindow = new google.maps.InfoWindow({
		    content: '<img src="'+item.url_s+'" />'
		});
		var latlng = new google.maps.LatLng(item.latitude,item.longitude);
		var marker = new google.maps.Marker({
			position: latlng,
			map: map, 
			title: item.title,
			icon: 'http://maps.gstatic.com/intl/fi_fi/mapfiles/ms/micons/camera.png',
			animation: google.maps.Animation.DROP
		});
		
		// drawPoint(latlng);
		
		google.maps.event.addListener(marker, 'mouseover', function() {
		  infowindow.open(map,marker);
		});
		google.maps.event.addListener(marker, 'mouseout', function() {
		  infowindow.close();
		});
	});
}

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
			icon: 'https://chart.googleapis.com/chart?chst=d_map_pin_letter_withshadow&chld='+item.hereNow.count+'|C6E7DE|000000',
			animation: google.maps.Animation.DROP
		});
		
		// drawPoint(latlng);
		
		google.maps.event.addListener(marker, 'mouseover', function() {
		  infowindow.open(map,marker);
		});
		google.maps.event.addListener(marker, 'mouseout', function() {
		  infowindow.close();
		});
	})	
}

function initializeMap() {
    var latlng = new google.maps.LatLng(60.170833,24.9375);
    var myOptions = {
      zoom: 12,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);
  }
  
function initializeHeatmap() {
	var heatmap = new Heatmap(document.getElementById('canvas'));
}
  
  /*
				function drawPoint(latlng) {
					
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
				
					var canvas = document.getElementById("canvas");
      				if (canvas.getContext) {
						var ctx = canvas.getContext("2d");
  				
						// Create gradients
						var radius = 80;
						var pointAlpha = 0.5;
						var pointColor = '255, 0, 0'
					
						// Create gradients

						  // Create gradients
						  var radgrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
						  radgrad.addColorStop(0, 'rgba(' + pointColor + ', 0.5)');
						  radgrad.addColorStop(1, 'rgba(' + pointColor + ', 0)');
					  
						  // draw shapes
						  ctx.fillStyle = radgrad;
						  ctx.fillRect(x-radius,y-radius,x+radius,y+radius);
					}
				}
*/