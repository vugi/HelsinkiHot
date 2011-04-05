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
		url: "api/venues",
   		success: function(jsonData){
			console.log(jsonData);
			showForsquareData(jsonData);
		}
	});
  
  $("#radiusSlider").slider({
    min: 5, 
    max: 100,
    value: Heatmap.DEFAULT_RADIUS, 
    range: "min", 
    slide: function( event, ui ) {
      heatmap.setRadius(ui.value);
      heatmap.update();
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
      heatmap.update();
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
      heatmap.update();
  }});
});

function showForsquareData(jsonData){
	$(jsonData).each(function(i,item){				
		var latlng = new google.maps.LatLng(item.location.lat,item.location.lng);
		heatmap.addHotspot(latlng,item.hereNow.count);
		
		// Google maps marker
		/*
		var marker = new google.maps.Marker({
		  position: latlng, 
		  map: map, 
		  title: item.name,
			icon: 'https://chart.googleapis.com/chart?chst=d_map_pin_letter_withshadow&chld='+item.hereNow.count+'|C6E7DE|000000'
		});
		*/
		// Google maps Info Window + show on mouseover
		/*
		var infowindow = new google.maps.InfoWindow({
		    content: item.name+'<br/>now: '+item.hereNow.count+'<br/>total: '+item.stats.checkinsCount
		});	
		google.maps.event.addListener(marker, 'mouseover', function() {
		  infowindow.open(map,marker);
		});
		google.maps.event.addListener(marker, 'mouseout', function() {
		  infowindow.close();
		});
		*/
	});
	
	heatmap.update();	
}

function initializeMap() {
    var latlng = new google.maps.LatLng(60.180833,24.9375);
    
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
      zoom: 12,
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
	heatmap = new Heatmap(document.getElementById('canvas'));
}

function drawPoint(latlng,count) {
  
  var x = point.x;
  var y = point.y;
  
}