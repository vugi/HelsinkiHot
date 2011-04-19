var comet = {
  //var socket;
  initializeSocket: function() {
    // Socket.io test
    comet.socket = new io.Socket("localhost"); 
    comet.socket.on('connect', function(){
      console.log("Socket connected!");
      //showPollingArea();
    }); 
    comet.socket.on('message', function(data){ 
      data = $.parseJSON(data);
      console.log("Socket message: " + data);
      if (data.response === "pollingArea") {
        comet.onPollingArea(data);
      } else if (data.response === "newEvent") {
        comet.showNewEvent(data.content);
      }
    
    });
    comet.socket.on('disconnect', function(){
      console.log("Socket disconnected");
    }); 
  
    comet.socket.connect();
  },

  onPollingArea: function(data) {
    var dataObject = data;
  
    var nw = dataObject.content.nwLatLng;
    var se = dataObject.content.seLatLng;
  
    if(comet.rectangle == null) {
      comet.rectangle = new google.maps.Rectangle({
        bounds: new google.maps.LatLngBounds(
          new google.maps.LatLng(nw.lat, nw.lng),
          new google.maps.LatLng(se.lat, se.lng)
        ),
        strokeColor: "#FF0000",
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35
      });
    
      comet.rectangle.setMap(map);
    } else {
      comet.rectangle.setBounds(new google.maps.LatLngBounds(
          new google.maps.LatLng(nw.lat, nw.lng),
          new google.maps.LatLng(se.lat, se.lng)
      ));
    }
  },
  
  showNewEvent: function(ev) {
    console.log(ev);
    $('#fs-event-log ul').append("<li>" + ev.event.event.points + " @ "+ev.event.venue.name+"</li>");
  },

  showPollingArea: function() {
    comet.socket.send('{"request": "startPollingAreas"}');
  },
  
  endPollingArea: function() {
    comet.socket.send('{"request": "stopPollingAreas"}');
  },

  // Initialize controls
  init: function() {
  
    var newRowSizeX, newRowSizeY;
  
    $('#fs-search-button').click(function() {
      getVenues();
      return false;
    });
  
    $('#fs-hide-console').click(function() {
      $('#sidebar').hide('slow');
      $('#sidebar-bg').hide('slow');
    });
  
    $('#fs-hide-canvas').click(function() {
      $('#canvas').hide('slow');
    });
  
    $('#fs-show-polling-area').click(function() {
      //initializeSocket();
      var el = $(this);
      if (!el.hasClass('active')) {
        comet.showPollingArea();
      } else {
        comet.endPollingArea();
      }
      el.toggleClass('active');
      return false;
    });
  
    comet.initializeSocket();
  }
}
$(document).ready(function() {
  comet.init();
});