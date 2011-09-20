// FIXME. It this correct please? And another point: Use the log function from HTML5 Boilerplate
function log(msg) {
    if (window.console && console.log) {
        console.log(msg);
    }
}

var Notification = Spine.Controller.create({
    proxied: ['notifyNewVenue'],

    init: function() {
        this.enabled = false;
        Venue.bind("create", this.notifyNewVenue);
    },

    notify: function(msg) {
        // queue text change the same way as effects to prevent text updating
        // before previous msg's effects have taken place
        if (this.enabled) {
            var el = this.el;
            el.queue(function() {
                el.text(msg);
                $(this).dequeue();
            })
                .fadeIn(500)
                .delay(3500)
                .fadeOut(500);
        }
    },

    notifyNewVenue: function(venue) {
        var events = venue.events;
        var points = _.reduce(events, function(memo, event) {
            return memo + event.points;
        }, 0);
        var msg = points + " checkin" + (points == 1 ? "" : "s") +
            " @ " + venue.name;
        this.notify(msg);
    }
});

var Venue = Spine.Model.setup('Venue', ['name', 'latitude', 'longitude', 'service', 'events']);

Venue.loadSince = function(hours, callback) {
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
        success: function(data) {
            Venue.dataLoaded(data, callback);
        }
    });
};

// FIXME Should use Spine.Ajax!
Venue.dataLoaded = function(jsonData, callback) {
    console.log(jsonData.venues);
    Venue.refresh(jsonData.venues);

    var venuesData = jsonData.venues;
    _.each(venuesData, function(venueData) {
        Venue.init(venueData).save();
    });

    callback();
};

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
        if (!wasMapReady && this.mapReady) {
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
        this.initializeNotifications();
    },

    initializeMap: function() {
        this.map = Map.init();
        this.map.bind('mapready', function() {
            Venue.loadSince(1, function() {
                this.notifications.enabled = true;
            });
        });
    },

    initializeConsole: function() {
        this.console = Console.init();
    },

    initializeNotifications: function() {
        this.notifications = Notification.init({el: $('#notifications')});
    },

    render: function() {

    },

    template: function() {

    }
});

$(function() {
    var app = HelsinkiHot.init({el: $("#helsinkihot_app")});
    socket.init();
});