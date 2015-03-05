'use strict';

Raphael(10, 10, 1000, 400, function () {

    // countries on the map
    var countries = {};
    // visited places
    var visitedPlaces = {};
    // world map
    var world;
    // Raphael plugin
    var r = this;
    // Google geocoder
    var googleGeocoder;

    // runs on click over a country
    var click = function(){
        // this.stop().animate({fill: '#bacabd'}, 500);              			
    };

    // transforms real coordinates (lat-lon) into map coordinates
    var getXY = function (lat, lon) {
        return {
            cx: lon * 2.6938 + 465.4,
            cy: lat * -2.6938 + 227.066
        };
    };

    // transforms map coordinates into  real coordinates
    var getLatLon = function (x, y) {
        return {
            lat: (y - 227.066) / -2.6938,
            lon: (x - 465.4) / 2.6938
        };
    };

    var latlonrg = /(\d+(?:\.\d+)?)[\xb0\s]?\s*(?:(\d+(?:\.\d+)?)['\u2019\u2032\s])?\s*(?:(\d+(?:\.\d+)?)["\u201d\u2033\s])?\s*([SNEW])?/i;
    var parseLatLon = function (latlon) {
        var m = String(latlon).split(latlonrg);
        var lat = m && +m[1] + (m[2] || 0) / 60 + (m[3] || 0) / 3600;
        if (m[4].toUpperCase() === 'S') {
            lat = -lat;
        }
        var lon = m && +m[6] + (m[7] || 0) / 60 + (m[8] || 0) / 3600;
        if (m[9].toUpperCase() === 'W') {
            lon = -lon;
        }
        return this.getXY(lat, lon);
    };

    // gets the user's current location
    var currentLocation = function(){
        try {
            if(navigator.geolocation){
                navigator.geolocation.getCurrentPosition(function (pos) {
                    r.circle().attr({fill: 'none', stroke: '#f00', r: 5}).attr(world.getXY(pos.coords.latitude, pos.coords.longitude));
                });
            }
        } catch (e) {}
    };

    // marks user's visited cities
    var markVisitedCities = function(){
        WorldMapController.getVisitedPlaces(map, markVisitedCitiesCallback);
    };

    var markVisitedCitiesCallback = function(result, event, error){
        if(error){
            alert('error marking visited cities');
        }else{
            for(var index in result){
                if (result.hasOwnProperty(index)) {
                    var place = result[index];
                    markCityOnMap(place);
                }
            }
        }
    };

    // shows place details when hovering over the dot  
    var showPlaceDetails = function(){
        var id = this.id;
        var place = visitedPlaces[id];

        var template = $('#popoverTemplate').html();
        Mustache.parse(template);   // optional, speeds up future uses
        var rendered = Mustache.render(template, place);
        $('#placeDetails').append(rendered);
        $('#placeDetails').show();
    };
    
    // hides place details when hovering out of the dot
    var hidePlaceDetails = function(){
        $('#placeDetails').empty();
        $('#placeDetails').hide();
    };

    // mark city on the map
    var markCityOnMap = function(place){
        $('#placesList').empty();
        var dot = r.circle().attr({fill: 'r#FE7727:50-#F57124:100', stroke: '#fff', 'stroke-width': 1, r: 0});
        var attr = getXY(place.latitude, place.longitude);
        attr.r = 0;
        dot.stop().attr(attr).animate({r: 2}, 1000, 'elastic');     
        // function to run when hover in and out of the dot
        dot.hover(showPlaceDetails, hidePlaceDetails);
        place.toDate = new Date(place.toDate).toLocaleDateString();
        place.fromDate = new Date(place.fromDate).toLocaleDateString();
        visitedPlaces[dot.id] = place;
        highlightVisitedCountry(place);
    };

    // saves a place in salesforce and marks the dot on the map
    var savePlace = function(){
        try{
            var coordinates = $('#placesList').val().split('|');
            var countryCode = $('#placesList option:selected').attr('data-country');
            var lat = coordinates[0];
            var lon = coordinates[1];
            var tripName = $('#tripName').val();
            var from = $('#fromDate').val();
            var to = $('#toDate').val();
            var tripStory = $('#tripStory').val();
            var place = {
                name: tripName,
                fromDate: new Date(from).toUTCString(),
                toDate: new Date(to).toUTCString(),
                story: tripStory,
                latitude: lat,
                longitude: lon,
                mapId: map,
                code: countryCode
            };

            WorldMapController.savePlace(place, savePlaceCallback);  

        }catch(err){
            console.log('error getting coordinates -> ', err); 
        }

    };

    var savePlaceCallback = function(result, event, error){
        $('#closeModalButton').trigger('click');
        $('#tripName').val('');
        $('#fromDate').val('');
        $('#toDate').val('');
        $('#tripStory').val('');
        if(result.success){
            markCityOnMap(result);
        } else {
            alert(result.errorMessage);
        }
    };

    // highlights user's visited countries
    var highlightVisitedCountry = function(place){
        var countryOnMap = countries[place.code];
        // #bacabd
        try{
            world[countryOnMap.id].stop().animate({fill: '#82ce82'}, 500);
        }catch(err){
            console.log('error highlighting country', place);
        }
    };

    // creates the world map
    var createWorldMap = function(){
        r.rect(0, 0, 1000, 400, 10).attr({
            stroke: 'none',
            fill: '0-#9bb7cb-#adc8da'
        });

        r.setStart();
        var countryId = 0;
        for (var country in worldmap.shapes) {
            if (worldmap.shapes.hasOwnProperty(country)) {
                r.path(worldmap.shapes[country]).attr({stroke: 'black', fill: '#f0efeb', 'stroke-opacity': 0.25});
                countries[country] = {
                    name: worldmap.names[country],
                    id: countryId
                };
                countryId++;
            }
        }
        world = r.setFinish();
        world.click(click);
        world.getXY = getXY;
        world.getLatLon = getLatLon;
        world.parseLatLon = parseLatLon;
    };

    var updatePlacesList = function(placesList){
        $('#placesList').empty();
        for(var place in placesList){
            if(placesList.hasOwnProperty(place)){
                var placeName = placesList[place].formatted_address;
                var location = placesList[place].geometry.location;
                var countryArraySize = placesList[place].address_components.length;
                var countryCode = placesList[place].address_components[countryArraySize-1].short_name;
                $('#placesList').append('<option data-country="'+countryCode+'" value="'+location.k+'|'+location.D+'">'+placeName+'</value>');
            }
        }
        $('#hiddenModalButton').trigger('click');
    };

    // get the geolocation for the specific address
    var getGeolocation = function(){
        var address = $('#geocodeAddress').val();
        googleGeocoder.geocode( { 'address': address}, function(results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                updatePlacesList(results);
            } else {
                 alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    };

    // gets the coordinates for the specific place and set the values in the places picklist
    $('#geocodeButton').click(function(e) {
        e.preventDefault();
        getGeolocation();
    });

    // saves the place in salesforce and marks it on the map
    $('#savePlaceButton').click(function(e) {
        e.preventDefault();
        savePlace();
    });

    $('#zoomInButton').click(function(e) {
        e.preventDefault();
        $('svg').animate({ 'zoom': 1.5 }, 400);
        $(this).prop('disabled', 'disabled');
        $('#zoomOutButton').removeProp('disabled');
    });

    $('#zoomOutButton').click(function(e) {
        e.preventDefault();
        $('svg').animate({ 'zoom': 1.0 }, 400);
        $(this).prop('disabled', 'disabled');
        $('#zoomInButton').removeProp('disabled');
    });

    // when enter key is pressed, call the function passed as parameter
    var enterKeyPressed = function(myfunction){
        $('input').keypress(function (e) {
            var k = e.keyCode || e.which;
                if (k === 13) {
                    if(myfunction) {
                        myfunction.call();
                    }
                    return false; 
                }
        });
    };

    // initialize the map
    var init = function(){
        createWorldMap();
        markVisitedCities();
        enterKeyPressed(getGeolocation);
        currentLocation();

        // move the map to the right panel
        $('svg').appendTo('#worldMapPanel');

        // init google geocoder
        googleGeocoder = new google.maps.Geocoder();
    };

    init();
});
