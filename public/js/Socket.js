var socket = {
  followEvents: false,
  followPolling: false,
  grid: [],
  
  //var socket;
  initializeSocket: function() {
    // Socket.io test
    socket.socket = new io.Socket(document.domain); 
    socket.socket.on('connect', function(){
      log("Socket connected!");
    }); 
    socket.socket.on('message', function(data){ 
      data = $.parseJSON(data);
      var response = data.response;
      if (response === "pollingArea") {
        socket.onPollingArea(data);
      } else if (response === "newEvent") {
        socket.showNewEvent(data.content);
      } else if (response === "pollingGrid") {
        socket.onPollingGrid(data);
      }
    
    });
    socket.socket.on('disconnect', function(){
      log("Socket disconnected");
    }); 
  
    socket.socket.connect();
  },
  
  onPollingGrid: function(data) {
    var pollingGridArray = data.content;
    
    // Clean up
    $.each(socket.grid, function(index, rectangle) {
      rectangle.setMap(null);
    })
    
    socket.grid = [];
    
    $.each(pollingGridArray, function(index2, grid) {
        
        socket.grid.push(new google.maps.Rectangle({
        bounds: new google.maps.LatLngBounds(
          new google.maps.LatLng(grid.nwLatLng.lat, grid.nwLatLng.lng),
          new google.maps.LatLng(grid.seLatLng.lat, grid.seLatLng.lng)
        ),
        strokeColor: "#000000",
        strokeOpacity: 1,
        strokeWeight: 1,
        fillOpacity: 0,
        map: map
      }));
    })
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
    log(ev);
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
  
  startPollingGrid: function() {
    socket.socket.send('{"request": "startPollingGrid"}');
  },
  
  endPollingGrid: function() {
    socket.socket.send('{"request": "endPollingGrid"}');
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