/**
 * Loads data from API and displays it.
 */

var map, heatmap, labelOverlay;
  
function addVenue(item, pan, addedBySocket){
  var latlng = new google.maps.LatLng(item.latitude, item.longitude);
  var lastIndex = item.events.length > 0 ? item.events.length - 1 : 0;
  var latestEvent = item.events[lastIndex];
  
  if (addedBySocket) {
    labelOverlay.addLabel(item);
  }
  
  heatmap.addHotspot(latlng, latestEvent.points);
  
  if (pan) {
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
    
    google.maps.event.addListener(circle, 'mousemove', function(){
      $hoverBox.html(item.name + " <span class='count'>" + latestEvent.points + "</span>").fadeIn('fast').css({
        left: event.clientX + 10,
        top: event.clientY
      });
    });
    google.maps.event.addListener(circle, 'mouseout', function(){
      $hoverBox.fadeOut();
    });
  }
}

$(document).ready(function(){
  
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
    
    $('#likeLink').hover(function() {
      $('#likes').slideDown();
    }, function() {
      $('#likes').slideUp();
    });
    
    // hash change can be because of user wanting to show the console
    $(window).bind('hashchange', function() {
      initializeConsole();
    });
  
});

/**
* Displays a growl-like notification in the lower right corner of the screen. 
* If a new notification is tried to display when another one is being displayed,
* the system will wait until the old one has been disappeared.
*
*/

function notification(msg) {
  //log('Notification: '+msg)
  var el = $('#notifications');
  el
    // queue text change the same way as effects to prevent text updating
    // before previous msg's effects have taken place
    .queue(function() {
      el.text(msg);
      $(this).dequeue();
    })
    .fadeIn(500)
    .delay(3500)
    .fadeOut(500);
}