/**
 * Loads data from API and displays it.
 */

var map;

$(document).ready(function(){
	initializeMap();
	$.ajax({
		type: "GET",
		url: "api/venues",
   		success: function(jsonData){
			console.log(jsonData);
			showData(jsonData);
		}
	});
});

function showData(jsonData){
	var list = $('<ol>').appendTo('body');
	$(jsonData.items).each(function(i,item){
		console.log(item);
		
		// List item
		$('<li>').html(item.name+' '+item.hereNow.count+'/'+item.stats.checkinsCount).appendTo(list);
		
		// Google maps Info Window
		var infowindow = new google.maps.InfoWindow({
		    content: item.name+'<br/>now: '+item.hereNow.count+'<br/>total: '+item.stats.checkinsCount
		});
		
		// Google maps marker
		var marker = new google.maps.Marker({
		      position: new google.maps.LatLng(item.location.lat,item.location.lng), 
		      map: map, 
		      title: item.name,
			animation: google.maps.Animation.DROP
		});
		
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
      zoom: 17,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);
  }