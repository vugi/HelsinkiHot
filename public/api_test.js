/**
 * Loads data from API and displays it.
 */

var map;
var flickrUrl = "http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=fdcac6bab07bf694be5d47005ba304ee&lat=60.170833&lon=24.9375&sort=date-taken-desc&radius=10&extras=date_taken,geo,url_s,url_sq&min_taken_date=2011-03-12&max_taken_date=2011-03-13&format=json&jsoncallback=?";

$(document).ready(function(){
	initializeMap();
	
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
	$(jsonData.photos.photo).each(function(i,item){			
		// Google maps Info Window
		var infowindow = new google.maps.InfoWindow({
		    content: '<img src="'+item.url_s+'" />'
		});
		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(item.latitude,item.longitude), 
			map: map, 
			title: item.title,
			icon: item.url_sq,
			animation: google.maps.Animation.DROP
		});
		google.maps.event.addListener(marker, 'mouseover', function() {
		  infowindow.open(map,marker);
		});
		google.maps.event.addListener(marker, 'mouseout', function() {
		  infowindow.close();
		});
	});
}

function showForsquareData(jsonData){
	var list = $('<ol>').appendTo('body');
	$(jsonData).each(function(i,item){		
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
      zoom: 12,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);
  }