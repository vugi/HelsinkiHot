$(document).ready(function() {
  // Initialize controls
  var nextSearches = [];
  var firstSearch = true;
  var calculateNextSearches = true;
  var startPoint;
  var lngMaxLimit = 25.089684;
  var lngMinLimit = 24.729538;
  var latMaxLimit = 60.255486;
  var latMinLimit = 60.129880;
  var currentAngle = 0;
  var angleSteps = 10;
  var newRow = true;
  
  var newRowSizeX, newRowSizeY;
  
  $('#fs-search-button').click(function() {
    
    var lat, lng;
    if (firstSearch) {
      lat = $('#fs-lat').val();
      lng = $('#fs-lng').val();
      startPoint = new google.maps.LatLng(lat, lng);
      firstSearch = false;
    } else {
      var next = nextSearches.shift();
      lat = next.lat();
      lng = next.lng();
    }
    
    var url = 'https://api.foursquare.com/v2/venues/search?ll=#{lat},#{lng}&limit=50&client_id=LTEVQYSCQZZQKSPR1XAI4B0SAUD44AN4JKNURCL1ZFJ1IBDZ&client_secret=TL2ALQWU4VV5J5R5BCH3Z53EDFOU5KLSOIFZSJGLOSK4NGH1';
    
    url = url.replace('#{lat}', lat).replace('#{lng}', lng);
    
    var queryLatlng = new google.maps.LatLng(lat, lng);
    
    $.getJSON(url, function(data) {
        
        
      // Google maps marker
      /*
      var marker = new google.maps.Marker({
        position: queryLatlng, 
        map: map, 
        title: "Query lat lng center",
        icon: "http://www.google.com/intl/en_us/mapfiles/ms/micons/blue-dot.png"
      });
      */
      
      var items = data.response.groups[0].items;
      console.dir(items);
      
      var maxLat = -999999;
      var maxLng = -999999;
      var minLat = 999999;
      var minLng = 999999;
      var maxDistance = 0;
      
      $.each(items, function(index, item) {
        var location = item.location;
        maxLat = Math.max(maxLat, location.lat);
        maxLng = Math.max(maxLng, location.lng);
        minLat = Math.min(minLat, location.lat);
        minLng = Math.min(minLng, location.lng);
        maxDistance = Math.max(maxDistance, location.distance);
        
        var latlng = new google.maps.LatLng(location.lat, location.lng);
        
        /*
        // Google maps marker
        var marker = new google.maps.Marker({
          position: latlng, 
          map: map, 
          title: item.name
        });
        
        var sw = new google.maps.LatLng(minLat, minLng);
        var ne = new google.maps.LatLng(maxLat, maxLng);
        */
      });
      
      var rectPoly = new google.maps.Polygon({
        paths: [
          new google.maps.LatLng(minLat, minLng),
          new google.maps.LatLng(maxLat, minLng),
          new google.maps.LatLng(maxLat, maxLng),
          new google.maps.LatLng(minLat, maxLng)
        ],
        strokeColor: "#FF0000",
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35
      });
        
      rectPoly.setMap(map);
      
      var results = "<p>Max lat: " + maxLat + " <br />Min lat: " + minLat + " <br />Max lng: " + maxLng + " <br />Min lng: " + minLng + "<br />Max distance: " + maxDistance + "<br /></p>";
      $('#fs-search-result').html(results);
      
      var dxW = Math.abs(queryLatlng.lng() - minLng);
      var dxE = Math.abs(queryLatlng.lng() - maxLng);
      var dyN = Math.abs(queryLatlng.lat() - maxLat);
      var dyS = Math.abs(queryLatlng.lat() - minLat);
      
      // Set next searches
      if(newRow) {
        newRowSizeX = Math.abs(maxLng - minLng);
        newRowSizeY = Math.abs(maxLat - minLat);
        newRow = false;
      }
      
      if(calculateNextSearches) {
        var oLat = queryLatlng.lat();
        var oLng = queryLatlng.lng();
        
        var sizeX = Math.abs(maxLng - minLng);
        var sizeY = Math.abs(maxLat - minLat);
        
        var rad = currentAngle * Math.PI / 180;
        
        nextSearches[0] = new google.maps.LatLng(oLat + sizeY * Math.sin(rad), oLng + sizeX * Math.cos(rad));
        
        var next = nextSearches[0];
        
        if(next.lat() > latMaxLimit || next.lat() < latMinLimit || next.lng() > lngMaxLimit || next.lng() < lngMinLimit) {
          currentAngle = currentAngle + angleSteps;
          nextSearches[0] = new google.maps.LatLng(startPoint.lat(), startPoint.lng());
        }
        
        /*
        if (!nextRow) {
        
          // nextSearches[0] = new google.maps.LatLng(oLat + 2 * dyN, oLng - 2 * dxW);
          // nextSearches[1] = new google.maps.LatLng(oLat + 2 * dyN, oLng);
          // nextSearches[2] = new google.maps.LatLng(oLat + 2 * dyN, oLng + 2 * dxE);
          // nextSearches[3] = new google.maps.LatLng(oLat, oLng - 2 * dxW);
          
        // nextSearches[5] = new google.maps.LatLng(oLat - 2 * dyS, oLng - 2 * dxW);
        // nextSearches[6] = new google.maps.LatLng(oLat - 2 * dyS, oLng);
        // nextSearches[7] = new google.maps.LatLng(oLat - 2 * dyS, oLng + 2 * dxE);
        
        } else {
          var newRowLat = rowsFirst.lat() + 2 * newRowdyN; 
          nextSearches[0] = new google.maps.LatLng(newRowLat, rowsFirst.lng());
          rowsFirst = nextSearches[0];
          newRow = true;
        }
        */
      }
    });
    
    return false;
  });
  
  $('#fs-hide-console').click(function() {
    $('#sidebar').hide('slow');
    $('#sidebar-bg').hide('slow');
  });
  
  $('#fs-hide-canvas').click(function() {
    $('#canvas').hide('slow');
  });
})
