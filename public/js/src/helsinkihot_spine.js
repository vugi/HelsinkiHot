// FIXME. It this correct please? And another point: Use the log function from HTML5 Boilerplate
function log(msg) {
    if (window.console && console.log) {
        console.log(msg);
    }
}

var Venue = Spine.Model.setup('Venue', ['name', 'latitude', 'longitude', 'service', 'events']);

Venue.loadSince = function(hours) {
    // TODO Should probably use Spine.Ajax instead
    // showLoader(true);
    if (!hours) {
        hours = 1;
    }
    var time = new Date();
    time.setHours(time.getHours() - hours);
    $.ajax({
        type: "GET",
        url: "api/venues/since/" + time.getTime(),
        success: Venue.dataLoaded
    });
};

// FIXME Should use Spine.Ajax!
Venue.dataLoaded = function(jsonData) {
    console.log(jsonData.venues);
    Venue.refresh(jsonData.venues);

    var venuesData = jsonData.venues;
    _.each(venuesData, function(venueData) {
        Venue.init(venueData).save();
    });

    // showPolledForsquareData(jsonData.venues);
    // showLoader(false);
}

var Console = Spine.Controller.create({
    init: function() {
        var anchor = this.parseAnchorFromUrl();
        this.toggleConsoleByAnchor(anchor);
    },

    toggleConsoleByAnchor: function(anchor) {
        if (anchor === "console") {
            $('#sidebar').show();
            $('#sidebar-bg').show();
        }
    },

    parseAnchorFromUrl: function() {
        // Anchor with hash
        var anchor = window.location.hash;

        if (anchor.length === 0) {
            return;
        }

        // Anchor without hash
        return anchor.substr(1);
    }
});

var Map = Spine.Controller.create({
    proxied: ['addVenue', 'redrawMap'],

    init: function() {
        this.initMap();
        this.initHeatmap();
        this.initLabelOverlay();

        Venue.bind("create", this.addVenue);

        this.initializeDrawCycle();
    },

    addVenue: function(newVenue) {
        var latlng = new google.maps.LatLng(newVenue.latitude, newVenue.longitude);
        var points = _.last(newVenue.events).points;

        this.heatmap.addHotspot(latlng, points);
        this.invalidate();
    },

    initMap: function() {
        var latlng = new google.maps.LatLng(60.170833, 24.9375);

        /* Custom map type
         See: http://code.google.com/apis/maps/documentation/javascript/maptypes.html#StyledMaps
         Style made with: http://gmaps-samples-v3.googlecode.com/svn/trunk/styledmaps/wizard/index.html
         */

        var customMapStyles = [
            {
                featureType: "all",
                elementType: "labels",
                stylers: [
                    { visibility: "off" }
                ]
            },
            {
                featureType: "all",
                elementType: "all",
                stylers: [
                    { lightness: 10 }
                ]
            },
            {
                featureType: "administrative.locality",
                elementType: "labels",
                stylers: [
                    { visibility: "on" }
                ]
            }
        ];
        var customMapOptions = {
            name: "HelsinkiHot custom"
        };
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
        this.map = new google.maps.Map(document.getElementById("map_canvas"),
            myOptions);
        this.map.mapTypes.set('custom', customMapType);
        this.map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
    },

    initHeatmap: function() {
        google.maps.event.addListenerOnce(this.map, 'idle', this.proxy(function() {
            this.heatmap = new Heatmap(this.map);
            this.heatmapReady = true;
            this.checkMapReady();
        }));
    },

    initLabelOverlay: function() {
        google.maps.event.addListenerOnce(this.map, 'idle', this.proxy(function() {
            this.labelOverlay = new LabelOverlay(this.map);
            this.labelOverlayReady = true;
            this.checkMapReady();
        }));
    },

    checkMapReady: function() {
        var wasMapReady = this.mapReady;
        this.mapReady = this.heatmapReady && this.labelOverlayReady;
        if(!wasMapReady && this.mapReady) {
            this.trigger('mapready');
        }
    },

    initializeDrawCycle: function() {
        this.drawCycle = setInterval(this.redrawMap, 1000);
    },

    redrawMap: function() {
        if (this.mapReady && this.invalidated) {
            console.log('heatmap redrawn');
            this.heatmap.draw();
            this.invalidated = false;
        }
    },

    /**
     * Invalidate map view, which means that its redrawn on the next draw cycle
     */
    invalidate: function() {
        this.invalidated = true;
    }
});

var HelsinkiHot = Spine.Controller.create({
    events: {

    },

    elements: {

    },

    init: function() {
        this.initializeMap();
        this.initializeConsole();
    },

    initializeMap: function() {
        var map = Map.init();
        map.bind('mapready', function() {
            Venue.loadSince();
        });
    },

    initializeConsole: function() {
        var console = Console.init();
    },

    render: function() {

    },

    template: function() {

    }

    // FIXME
    /*
     showLoader: function(show) {
     if (show) {
     log("Show loader");
     $("<div id='loader'>Loading venues</div>").hide().appendTo("body").fadeIn('slow');
     } else {
     log("Hide loader");
     $("#loader").fadeOut('slow', function() {
     $(this).remove();
     });
     }
     }
     */
});

$(function() {
    var app = HelsinkiHot.init({el: $("#helsinkihot_app")});
});