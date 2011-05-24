/**
 * Loads data from API and displays it.
 */

var map, heatmap, labelOverlay;

$(document).ready(function(){
  initializeMap();
  initializeHeatmap();
  initializeLabelOverlay();
  initializeConsole();
  
  getVenueData(1);
  
  $("#hoursSlider").slider({
    min: 1, 
    max: 24,
    value: 1, 
    range: "min", 
    change: function( event, ui ) {
      heatmap._hotspots = [];
      getVenueData(ui.value);
  }});
  
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
      log(multiply);
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
    
    $("#authorInfo a#inline").fancybox();
    
    // hash change can be because of user wanting to show the console
    $(window).bind('hashchange', function() {
      initializeConsole();
    });
  
});

function getVenueData(hours){
  showLoader(true);
  if (!hours){
    hours = 1;
  }
  var time = new Date();
  time.setHours(time.getHours()-hours);
  $.ajax({
    type: "GET",
    url: "api/venues/since/"+time.getTime(),
    success: function(jsonData){
      showPolledForsquareData(jsonData.venues);
      showLoader(false);
    }
  });
}

function showPolledForsquareData(venues){
  if (venues.length == 0){
    alert("No events found! Try increasing time span.")
  }
  $(venues).each(function(i,item){
    addVenue(item);
  });
  heatmap.draw(); 
}

function addVenue(item,pan,addedBySocket){
  var latlng = new google.maps.LatLng(item.latitude, item.longitude);
  var lastIndex = item.events.length > 0 ? item.events.length - 1 : 0;
  var latestEvent = item.events[lastIndex];    
  
  if(addedBySocket) {
    labelOverlay.addLabel(item);
  }
  
  heatmap.addHotspot(latlng, latestEvent.points);
  
  if(pan){
    log("Panning");
    map.panTo(latlng);
    heatmap.draw();
    
    var circle = new google.maps.Marker({
      position: latlng, 
      map: map, 
      //radius: 100,
      //fillOpacity: 0,
      //strokeWeight: 0,
      //strokeOpacity: 0
      animation: google.maps.Animation.DROP
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
  }
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
      zoom: 11,
      minZoom: 11,
      maxZoom: 18,
      center: latlng,
      disableDefaultUI: true,
      mapTypeControl: true,
      zoomControl: true,
      mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, 'custom']
      }
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);
    map.mapTypes.set('custom', customMapType);
    map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
  }
  
function initializeHeatmap() {
	heatmap = new Heatmap(map);
}

function initializeLabelOverlay() {
  labelOverlay = new LabelOverlay(map);
}

function parseAnchorFromUrl(){
    // Anchor with hash
  var anchor = window.location.hash;
  
  if(anchor.length === 0) {
    return;
  }
  
  // Anchor without hash
  return anchor.substr(1);
}

function initializeConsole() {
  var anchor = parseAnchorFromUrl();
  
  if(anchor === "console") {
    $('#sidebar').show();
    $('#sidebar-bg').show();
  }
}

function showLoader(boolean){
  if(boolean){
    log("Show loader");
    $("<div id='loader'>Loading venues</div>").hide().appendTo("body").fadeIn('slow');
  } else {
    log("Hide loader");
    $("#loader").fadeOut('slow',function(){
      $(this).remove();
    });
  }
  
}

function log(msg) {
  if (window.console && console.log) {
    console.log(msg);
  }
}

var i = 0;
function notification(msg) {
  log('Notification: '+msg)
  $('#notifications')
    .queue(function() {
      $('#notifications').text(msg);
      $(this).dequeue();
    })
    
    .fadeIn(500)
    .delay(5000)
    .fadeOut(500);
  
}