/**
 * Loads data from API and displays it.
 */

var map;
var heatmap;

$(document).ready(function(){
	initializeMap();
	initializeHeatmap();
	
	/* Foursquare */
	$.ajax({
		type: "GET",
		url: "api/venues2",
   		success: function(jsonData){
			showPolledForsquareData(jsonData);
      // showForsquareData(jsonData);
		}
	});
  
  $("#radiusSlider").slider({
    min: 5, 
    max: 100,
    value: Heatmap.DEFAULT_RADIUS, 
    range: "min", 
    slide: function( event, ui ) {
      heatmap.setRadius(ui.value);
      heatmap.draw();
  }});
  
  $("#alphaMultiplySlider").slider({
    min: 0.1, 
    max: 5,
    step: 0.1,
    value: Heatmap.DEFAULT_ALPHA_MULTIPLIER,
    range: "min", 
    slide: function( event, ui ) {
      
      multiply = ui.value;
      heatmap.setHeatMultiplier(ui.value);
      console.log(multiply);
      heatmap.draw();
  }});
  
  $("#hotspotMultiplySlider").slider({
    min: 0.1, 
    max: 5,
    step: 0.1,
    value: Heatmap.DEFAULT_HOTSPOT_MULTIPLIER,
    range: "min", 
    slide: function( event, ui ) {
      
      multiply = ui.value;
      heatmap.setHotspotMultiplier(ui.value);
      console.log(multiply);
      heatmap.draw();
  }});
  
  $hoverBox = $("<div class='hoverBox'>")
	  .appendTo("#map_container")
	  .hide()
	  .css({
      position: "fixed",
      left: 0,
      top: 0,
      "z-index": 1000
    });
    
  // Socket.io test
  var socket = new io.Socket("localhost"); 
  socket.on('connect', function(){ 
    alert("Connected to scoket");
    socket.send('hi!'); 
  }); 
  socket.on('message', function(data){ 
    alert("Socket message: " + data);
  });
  socket.on('disconnect', function(){
    alert("Socket disconnected");
  }); 
  
  socket.connect();
  
});

function showPolledForsquareData(jsonData){
  var limit = 100;
  
  $(jsonData).each(function(i,item){
    if (limit <= i) {
      return;
    }
    
    var latlng = new google.maps.LatLng(item.latitude, item.longitude);
    var lastIndex = item.events.length > 0 ? item.events.length - 1 : 0;
    var latestEvent = item.events[lastIndex];    

    heatmap.addHotspot(latlng, latestEvent.points);
    
    var circle = new google.maps.Circle({
      center: latlng, 
      map: map, 
      radius: 200,
      fillOpacity: 0,
      strokeWeight: 0,
			strokeOpacity: 0
    });
  
    google.maps.event.addListener(circle, 'mousemove', function() {
      $hoverBox
        .html(item.name + " <span class='count'>" + latestEvent.points + "</span>")
        .fadeIn('fast')
        .css({
          left: event.clientX+10,
          top: event.clientY
        });
    });
    google.maps.event.addListener(circle, 'mouseout', function() {
      $hoverBox.fadeOut();
    });
  });
  
  heatmap.draw(); 
}

function showForsquareData(jsonData){
	$(jsonData).each(function(i,item){				
		var latlng = new google.maps.LatLng(item.location.lat,item.location.lng);
		heatmap.addHotspot(latlng,item.hereNow.count);
		
		var circle = new google.maps.Circle({
		  center: latlng, 
		  map: map, 
		  radius: 300,
		  fillOpacity: 0,
			strokeWeight: 0
		});
  
		google.maps.event.addListener(circle, 'mousemove', function() {
		  $hoverBox
		    .html(item.name + " <span class='count'>" + item.hereNow.count + "</span>")
		    .fadeIn('fast')
		    .css({
		      left: event.clientX+10,
		      top: event.clientY
	      });
		});
		google.maps.event.addListener(circle, 'mouseout', function() {
		  $hoverBox.fadeOut();
		});
	});
	
	heatmap.draw();	
}

function initializeMap() {
    var latlng = new google.maps.LatLng(60.170833,24.9375);
    
    /* Custom map type
    See: http://code.google.com/apis/maps/documentation/javascript/maptypes.html#StyledMaps
    Style made with: http://gmaps-samples-v3.googlecode.com/svn/trunk/styledmaps/wizard/index.html
    */
    var customMapStyles =[
      {
        featureType: "all",
        elementType: "labels",
        stylers: [
          { visibility: "off" }
        ]
      },{
        featureType: "all",
        elementType: "all",
        stylers: [
          { lightness: 10 }
        ]
      },{
        featureType: "administrative.locality",
        elementType: "labels",
        stylers: [
          { visibility: "on" }
        ]
      }
    ];
    var customMapOptions = {
         name: "HelsinkiHot custom"
      }
    var customMapType = new google.maps.StyledMapType(customMapStyles, customMapOptions);
    
    var myOptions = {
      zoom: 13,
      minZoom: 13,
      maxZoom: 13,
      center: latlng,
      disableDefaultUI: true,
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, 'custom']
      }
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);
    map.mapTypes.set('custom', customMapType);
    map.setMapTypeId('custom');
  }
  
function initializeHeatmap() {
	heatmap = new Heatmap(map);
}