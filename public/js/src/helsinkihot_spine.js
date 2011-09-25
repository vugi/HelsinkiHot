// FIXME. It this correct please? And another point: Use the log function from HTML5 Boilerplate
function log(msg) {
    if (window.console && console.log) {
        console.log(msg);
    }
}

var Slider = Spine.Controller.create({

    proxied: ['onChange', 'onSlide'],

    init: function() {
        // Initialize slider options
        var options = this.options || {};
        options = _.extend(options, {
            slide: this.onSlide,
            change: this.onChange
        });
        this.options = options;
        this.min = options.min || 0; // jQuery UI defaults
        this.max = options.max || 100; // jQuery UI defaults

        this.render();
    },

    render: function() {
        // Render slider
        $(this.el).slider(this.options);
    },

    onChange: function() {
        console.log('Slider changed');
    },

    onSlide: function(event, ui) {
        var value = ui.value;
        this.radius = this.calculateRadius(value);
        this.hotness = this.calculateHotness(value);

        this.trigger('slide', {radius: this.radius, hotness: this.hotness});
    },

    /**
     *
     * @param value 1-100
     */
    calculateRadius: function(value) {
        var minRadius = 10, maxRadius = 50;
        var valuePercentage = (value - this.min) / (this.max - this.min);
        var delta = maxRadius - minRadius;
        return minRadius + (delta * valuePercentage);
    },

    /**
     *
     * @param value 1-100
     */
    calculateHotness: function(value) {
        var minHotness = 1, maxHotness = 2;
        var valuePercentage = (value - this.min) / (this.max - this.min);
        var delta = minHotness - maxHotness;
        return maxHotness + (delta * valuePercentage);
    }

});

var Notification = Spine.Controller.create({
    proxied: ['notifyNewVenue'],

    init: function() {
        this.enabled = false;
        Venue.bind("create", this.notifyNewVenue);
    },

    notify: function(msg) {
        // queue text change the same way as effects to prevent text updating
        // before previous msg's effects have taken place
        console.log('Notify: ' + msg);

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

Venue.findNearestByLatLng = function(lat, lng) {
    var nearest = 99999;
    var nearestVenue = null;
    _.each(Venue.all(), function(venue) {


        var latDist = Math.abs(lat - venue.latitude);
        var lngDist = Math.abs(lng - venue.longitude);
        var dist = Math.sqrt(latDist * latDist + lngDist * lngDist);

        if(dist < nearest) {
            nearest = dist;
            nearestVenue = venue;
        }
    });
    return nearestVenue;
};

var Console = Spine.Controller.create({

    listTemplate: _.template($('#consoleListTemplate').html()),

    proxied: ['addVenue'],

    // DOM elements
    elements: {
        '#event-log-list': 'list'
    },

    init: function() {
        var anchor = this.parseAnchorFromUrl();
        this.toggleConsoleByAnchor(anchor);
        Venue.bind("create", this.addVenue);
    },

    toggleConsoleByAnchor: function(anchor) {
        if (anchor === "console") {
            // FIXME There shouldn't be need for sidebar and sidebar-bg! Remove sidebar-bg,
            // move all those css styles to sidebar.
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
    },

    addVenue: function(venue) {
        if (this.enabled) {
            var venueValues = venue.toJSON();
            var list = $('#event-log-list');
            list.append(this.listTemplate(venueValues));
        }
    }
});

var Map = Spine.Controller.create({
    proxied: ['addVenue', 'redrawMap', 'mouseMoved'],

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
        this.labelOverlay.addLabel(newVenue);

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

        google.maps.event.addListener(this.map, 'mousemove', this.mouseMoved);

        console.log('Map initialized');


    },

    initHeatmap: function() {
        google.maps.event.addListenerOnce(this.map, 'idle', this.proxy(function() {
            this.heatmap = new Heatmap(this.map);
            this.heatmapReady = true;
            console.log('Heatmap initialized');
            this.checkMapReady();
        }));
    },

    initLabelOverlay: function() {
        google.maps.event.addListenerOnce(this.map, 'idle', this.proxy(function() {
            this.labelOverlay = new LabelOverlay(this.map);
            this.labelOverlayReady = true;
            console.log('Label overlay initialized');
            this.checkMapReady();
        }));
    },

    checkMapReady: function() {
        var wasMapReady = this.mapReady;
        this.mapReady = this.heatmapReady && this.labelOverlayReady;
        if (!wasMapReady && this.mapReady) {
            console.log('All map components initialized');
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
    },

    setHeatmapRadius: function(value) {
        this.heatmap.setRadius(value);
        this.invalidate();
    },

    setHeatmapHotness: function(value) {
        this.heatmap.setHeatMultiplier(value);
        this.invalidate();
    },

    mouseMoved: function(event) {
        var threshold = 0.001;
        debugger;

        var lat = event.latLng.lat();
        var lng = event.latLng.lng();

        var nearestVenue = Venue.findNearestByLatLng(lat, lng, threshold);
        if (Math.abs(nearestVenue.latitude - lat) < threshold && Math.abs(nearestVenue.longitude - lng) < threshold) {
            this.labelOverlay.addTooltipLabel(nearestVenue);
        } else {
            this.labelOverlay.hideTooltipLabel();
        }
    }
});

var HelsinkiHot = Spine.Controller.create({

    proxied: ['detailsSliderSlided'],

    // DOM events
    events: {

    },

    // DOM elements
    elements: {

    },

    init: function() {
        this.initializeMap();
        this.initializeConsole();
        this.initializeNotifications();
        this.initializeDetailsSlider();
    },

    initializeMap: function() {
        this.map = Map.init();
        this.map.bind('mapready', this.proxy(function() {
            console.log('Loading venue data');
            Venue.loadSince(1, this.proxy(function() {
                // After the initial data is loaded, enable notifications

                // TODO Bad smell here! Refactor!
                this.enableNotifications();
                this.map.labelOverlay.enabled = true;
                this.console.enabled = true;
            }));
        }));
    },

    enableNotifications: function() {
        this.notifications.enabled = true;
    },

    initializeConsole: function() {
        this.console = Console.init();
    },

    initializeNotifications: function() {
        this.notifications = Notification.init({el: $('#notifications')});
    },

    initializeDetailsSlider: function() {
        var initialValue = 50;
        this.detailsSlider = Slider.init({el: $('#detailsSlider'), options: {
            min: 1,
            max: 100,
            range: "min",
            value: initialValue
        }});

        var setInitialSliderValuesToHeatmap = function() {
            this.map.setHeatmapHotness(this.detailsSlider.calculateHotness(initialValue));
            this.map.setHeatmapRadius(this.detailsSlider.calculateRadius(initialValue));
            this.map.invalidate();
        };

        if (this.map.mapReady) {
            this.proxy(setInitialSliderValuesToHeatmap());
        } else {
            this.map.bind('mapready', this.proxy(setInitialSliderValuesToHeatmap));
        }

        this.detailsSlider.bind('slide', this.detailsSliderSlided);
    },

    detailsSliderSlided: function(values) {
        this.map.setHeatmapRadius(values.radius);
        this.map.setHeatmapHotness(values.hotness);
        this.map.redrawMap();
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