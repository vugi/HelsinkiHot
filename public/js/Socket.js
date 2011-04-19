var socket = {
  followEvents: false,
  followPolling: false,
  
  //var socket;
  initializeSocket: function() {
    // Socket.io test
    socket.socket = new io.Socket(document.domain); 
    socket.socket.on('connect', function(){
      console.log("Socket connected!");
      //showPollingArea();
    }); 
    socket.socket.on('message', function(data){ 
      data = $.parseJSON(data);
      console.log("Socket message: " + data);
      if (data.response === "pollingArea") {
        socket.onPollingArea(data);
      } else if (data.response === "newEvent") {
        socket.showNewEvent(data.content);
      }
    
    });
    socket.socket.on('disconnect', function(){
      console.log("Socket disconnected");
    }); 
  
    socket.socket.connect();
  },

  onPollingArea: function(data) {
    var dataObject = data;
  
    var nw = dataObject.content.nwLatLng;
    var se = dataObject.content.seLatLng;
    
    if (socket.followPolling){
      map.panTo(new google.maps.LatLng((nw.lat+se.lat)/2, (nw.lng+se.lng)/2));
      heatmap.draw();
    }
  
    if(socket.rectangle == null) {
      socket.rectangle = new google.maps.Rectangle({
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
    
      socket.rectangle.setMap(map);
    } else {
      socket.rectangle.setBounds(new google.maps.LatLngBounds(
          new google.maps.LatLng(nw.lat, nw.lng),
          new google.maps.LatLng(se.lat, se.lng)
      ));
    }
  },
  
  showNewEvent: function(ev) {
    console.log(ev);
    $('#fs-event-log ul').append("<li>" + 
      ev.venue.events[0].points + " @ " + ev.venue.name + 
      "</li>");
      addVenue(ev.venue,socket.followEvents);
  },

  showPollingArea: function() {
    socket.socket.send('{"request": "startPollingAreas"}');
  },
  
  endPollingArea: function() {
    socket.socket.send('{"request": "stopPollingAreas"}');
    socket.rectangle.setMap(null);
    socket.rectangle = null;
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
    
    $('#fs-hide-canvas').click(function() {
      $('#canvas').hide('slow');
    });
  
    $('#show-polling-area').click(function() {
      if ($(this).is(':checked')) {
        socket.showPollingArea();
        $('#follow-polling-area').removeAttr('disabled');
      } else {
        socket.endPollingArea();
        $('#follow-polling-area').attr('disabled',true);
      }
    });
    
    $('#follow-polling-area').click(function() {
      if ($(this).is(':checked')) {
        socket.followPolling = true;
      } else {
        socket.followPolling = false;
      }
    });
    
    $('#follow-new-events').click(function() {
      if ($(this).is(':checked')) {
        socket.followEvents = true;
      } else {
        socket.followEvents = false;
      }
    });
  
    socket.initializeSocket();
  }
}
$(document).ready(function() {
  socket.init();
});