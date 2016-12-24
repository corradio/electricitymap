// Libraries
var Cookies = require('js-cookie');
var d3 = require('d3');
var moment = require('moment');

// Modules
var co2eq_parameters = require('./co2eq_parameters');
var CountryConfig = require('./countryconfig');
var CountryMap = require('./countrymap');
var CountryTable = require('./countrytable');
var CountryTopos = require('./countrytopos');
var DataService = require('./dataservice');
var ExchangeConfig = require('./exchangeconfig');
var ExchangeLayer = require('./exchangelayer');
var grib = require('./grib');
var HorizontalColorbar = require('./horizontalcolorbar');
var Solar = require('./solar');
var Wind = require('./wind');

// Constants
var REFRESH_TIME_MINUTES = 5;

// Global State
var selectedCountryCode;
var forceRemoteEndpoint = false;
var customDate;
var showWindOption = true;
var showSolarOption = false;

(function readQueryString() {
    args = location.search.replace('\?','').split('&');
    args.forEach(function(arg) {
        kv = arg.split('=');
        if (kv[0] == 'remote') {
            forceRemoteEndpoint = kv[1] == 'true';
        } else if (kv[0] == 'datetime') {
            customDate = kv[1];
            console.log('** Custom date: ' + customDate + ' **');
        } else if (kv[0] == 'solar') {
            showSolarOption = kv[1] == 'true';
        }
    });
})();

// Computed State
var windEnabled = showWindOption ? (Cookies.get('windEnabled') == 'true' || false) : false;
var solarEnabled = showSolarOption ? (Cookies.get('solarEnabled') == 'true' || false) : false;
var isLocalhost = window.location.href.indexOf('//electricitymap') == -1;

if (typeof _opbeat !== 'undefined')
    _opbeat('config', {
        orgId: '093c53b0da9d43c4976cd0737fe0f2b1',
        appId: 'f40cef4b37'
    });
else
    console.warn('Opbeat could not be initialized!');

function catchError(e) {
    console.error(e);
    if (!isLocalhost) {
        if(typeof _opbeat !== 'undefined')
            _opbeat('captureException', e);
        trackAnalyticsEvent('error', {'name': e.name});
    }
}

function isMobile() {
    return (/android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i).test(navigator.userAgent);
}
function isSmallScreen() {
    // Should be in sync with media queries in CSS
    return screen.width < 600;
}

// Analytics
function trackAnalyticsEvent(eventName, paramObj) {
    if (!isLocalhost) {
        try {
            if(typeof FB !== 'undefined')
                FB.AppEvents.logEvent(eventName, undefined, paramObj);
        } catch(err) { console.error('FB AppEvents error: ' + err); }
        try {
            if(typeof mixpanel !== 'undefined')
                mixpanel.track(eventName, paramObj);
        } catch(err) { console.error('Mixpanel error: ' + err); }
        try {
            if(typeof ga !== 'undefined')
                ga('send', eventName);
        } catch(err) { console.error('Google Analytics error: ' + err); }
    }
}

// Loading screen
function startLoading() {
    d3.select('.loading')
        .style('display', 'block')
        .transition()
        .style('opacity', 0.8);
}

function stopLoading() {
    d3.select('.loading')
        .transition()
            .style('opacity', 0)
            .on('end', function() {
                d3.select(this).style('display', 'none');
            });
}

// Start chrome (or forced) version
var REMOTE_ENDPOINT = '//electricitymap.tmrow.co';
var ENDPOINT = (document.domain != '' && document.domain.indexOf('electricitymap') == -1 && !forceRemoteEndpoint) ?
    '' : REMOTE_ENDPOINT;

var co2color = d3.scaleLinear()
    .domain([0, 350, 700])
    .range(['green', 'orange', 'black'])
    .clamp(true);
var maxWind = 15;
var windColor = d3.scaleLinear()
    .domain(d3.range(10).map( function (i) { return d3.interpolate(0, maxWind)(i / (10 - 1)); } ))
    .range([
        "rgba(0,   255, 255, 1.0)",
        "rgba(100, 240, 255, 1.0)",
        "rgba(135, 225, 255, 1.0)",
        "rgba(160, 208, 255, 1.0)",
        "rgba(181, 192, 255, 1.0)",
        "rgba(198, 173, 255, 1.0)",
        "rgba(212, 155, 255, 1.0)",
        "rgba(225, 133, 255, 1.0)",
        "rgba(236, 109, 255, 1.0)",
        "rgba(255,  30, 219, 1.0)"
    ])
    .clamp(true);
// ** Solar Scale **
var maxSolar = 500;
var minDayDSWRF = 10;
var nightOpacity = 0.4;
var minSolarDayOpacity = 0.3;
var maxSolarDayOpacity = 0.0;
var solarDomain = d3.range(10).map(function (i) { return d3.interpolate(minDayDSWRF, maxSolar)(i / (10 - 1)); } );
var solarRange = d3.range(10).map(function (i) {
    var c = Math.round(d3.interpolate(0, 0)(i / (10 - 1)));
    var a = d3.interpolate(minSolarDayOpacity, maxSolarDayOpacity)(i / (10 - 1));
    return 'rgba(' + c + ', ' + c + ', ' + c + ', ' + a + ')';
});
// Insert the night (DWSWRF \in [0, 1]) domain
solarDomain.splice(0, 0, 1);
solarRange.splice(0, 0, 'rgba(0, 0, 0, ' + nightOpacity + ')');
// Create scale
var solarColor = d3.scaleLinear()
    .domain(solarDomain)
    .range(solarRange)
    .clamp(true);

// Set up objects
var countryMap = new CountryMap('.map', co2color);
var exchangeLayer = new ExchangeLayer('.map', co2color);
var countryTable = new CountryTable('.country-table', co2color);

var co2Colorbar = new HorizontalColorbar('.co2-colorbar', co2color)
    .markerColor('black')
    .render(); // Already render because the size is fixed
var windColorbar = new HorizontalColorbar('.wind-colorbar', windColor)
    .markerColor('black')
var solarColorbar = new HorizontalColorbar('.solar-colorbar', solarColor)
    .markerColor('black')

var tableDisplayEmissions = countryTable.displayByEmissions();

// Set weather checkboxes
d3.select("#checkbox-wind").node().checked = windEnabled;
d3.select("#checkbox-solar").node().checked = solarEnabled;

window.toggleSource = function() {
    tableDisplayEmissions = !tableDisplayEmissions;
    trackAnalyticsEvent(
        tableDisplayEmissions ? 'switchToCountryEmissions' : 'switchToCountryProduction',
        {countryCode: countryTable.data().countryCode});
    countryTable
        .displayByEmissions(tableDisplayEmissions);
    d3.select('.country-show-emissions')
        .style('display', tableDisplayEmissions ? 'none' : 'block');
    d3.select('.country-show-electricity')
        .style('display', tableDisplayEmissions ? 'block' : 'none');
}

var width = window.innerWidth;
var height = window.innerHeight;

var windCanvas = d3.select('.wind');
windCanvas.attr('height', height);
windCanvas.attr('width', width);

var solarCanvas = d3.select('.solar');
solarCanvas.attr('height', height);
solarCanvas.attr('width', width);

// Prepare data
var countries = CountryTopos.getCountryTopos(countries);
CountryConfig.addCountriesConfiguration(countries);
d3.entries(countries).forEach(function (o) {
    var country = o.value;
    country.maxCapacity =
        d3.max(d3.values(country.capacity));
    country.countryCode = o.key;
});
var exchanges = {};
ExchangeConfig.addExchangesConfiguration(exchanges);
d3.entries(exchanges).forEach(function(entry) {
    entry.value.countryCodes = entry.key.split('->').sort();
    if (entry.key.split('->')[0] != entry.value.countryCodes[0])
        console.error('Exchange sorted key pair ' + entry.key + ' is not sorted alphabetically');
});
var wind, solar;

function selectCountry(countryCode) {
    if (!countryCode || !countries[countryCode]) {
        // Unselected
        d3.select('.country-table-initial-text')
            .style('display', 'block');
        countryTable.hide();
        selectedCountryCode = undefined;
    } else {
        // Selected
        console.log(countries[countryCode]);
        trackAnalyticsEvent('countryClick', {countryCode: countryCode});
        d3.select('.country-table-initial-text')
            .style('display', 'none');
        countryTable
            .show()
            .data(countries[countryCode]);
        selectedCountryCode = countryCode;
    }
    if (isSmallScreen())
        d3.select('#country-table-back-button').style('display',
                selectedCountryCode ? 'block' : 'none');
}

// Mobile
if (isSmallScreen()) {
    d3.select('.map').selectAll('*').remove();
    d3.select('#country-table-back-button')
        .on('click', function() { selectCountry(undefined); });
} else {
    d3.select('.panel-container')
        .style('width', '330px');
    // Now that the width is set, we can render the legends
    windColorbar.render();
    solarColorbar.render();

    // Set example arrow
    exchangeLayer.renderOne('svg#example-arrow');

    // Attach event handlers
    d3.select('#checkbox-wind').on('change', function() {
        windEnabled = !windEnabled;
        Cookies.set('windEnabled', windEnabled);
        if (windEnabled) {
            if (!wind || grib.getTargetTime(wind.forecasts[1][0]) >= moment.utc()) {
                fetch(false, true);
            } else {
                Wind.show();
            }
        } else {
            Wind.hide();
        }
    });
    d3.select('#checkbox-solar').on('change', function() {
        solarEnabled = !solarEnabled;
        Cookies.set('solarEnabled', solarEnabled);
        if (solarEnabled) {
            if (!solar || grib.getTargetTime(solar.forecasts[1]) >= moment.utc()) {
                fetch(false, true);
            } else {
                Solar.show();
            }
        } else {
            Solar.hide();
        }
    });
    function mapMouseOver(coordinates) {
        if (windEnabled && wind && coordinates) {
            var lonlat = countryMap.projection().invert(coordinates);
            var now = customDate ? moment(customDate) : (new Date()).getTime();
            if (moment(now) <= moment(grib.getTargetTime(wind.forecasts[1][0]))) {
                var u = grib.getInterpolatedValueAtLonLat(lonlat, 
                    now, wind.forecasts[0][0], wind.forecasts[1][0]);
                var v = grib.getInterpolatedValueAtLonLat(lonlat, 
                    now, wind.forecasts[0][1], wind.forecasts[1][1]);
                windColorbar.currentMarker(Math.sqrt(u * u + v * v));
            }
        } else {
            windColorbar.currentMarker(undefined);
        }
        if (solarEnabled && solar && coordinates) {
            var lonlat = countryMap.projection().invert(coordinates);
            var now = customDate ? moment(customDate) : (new Date()).getTime();
            if (moment(now) <= moment(grib.getTargetTime(solar.forecasts[1]))) {
                var val = grib.getInterpolatedValueAtLonLat(lonlat, 
                    now, solar.forecasts[0], solar.forecasts[1]);
                solarColorbar.currentMarker(val);
            }
        } else {
            solarColorbar.currentMarker(undefined);
        }
    }
    d3.select('.map')
        .on('mousemove', function() {
            mapMouseOver(d3.mouse(this));
        })
        .on('mouseout', function() {
            mapMouseOver(undefined);
        });
    countryTable
        .onExchangeMouseOver(function (d, countryCode) {
            var isExport = d.value < 0;
            var o = d.value < 0 ? countryCode : d.key;
            var co2intensity = countries[o].co2intensity;
            co2Colorbar.currentMarker(co2intensity);
            var tooltip = d3.select('#countrypanel-exchange-tooltip');
            tooltip.style('display', 'inline');
            tooltip.select('#label').text(isExport ? 'export to' : 'import from');
            tooltip.select('#country-code').text(o);
            tooltip.select('.emission-rect')
                .style('background-color', co2intensity ? co2color(co2intensity) : 'gray');
            tooltip.select('.emission-intensity')
                .text(Math.round(co2intensity) || '?');
            tooltip.select('i#country-flag')
                .attr('class', 'flag-icon flag-icon-' + o.toLowerCase());
        })
        .onExchangeMouseOut(function (d) {
            co2Colorbar.currentMarker(undefined);
            d3.select('#countrypanel-exchange-tooltip')
                .style('display', 'none');
        })
        .onExchangeMouseMove(function(d) {
            d3.select('#countrypanel-exchange-tooltip')
                .style('transform',
                    'translate(' +
                        (d3.event.pageX + 15) + 'px' + ',' + 
                        (d3.event.pageY + 15) + 'px' +
                    ')');
        })
        .onProductionMouseOver(function (d, countryCode) {
            var co2intensity = co2eq_parameters.footprintOf(d.mode, countryCode);
            co2Colorbar.currentMarker(co2intensity);
            var tooltip = d3.select('#countrypanel-production-tooltip');
            tooltip.style('display', 'inline');
            tooltip.select('#mode').text(d.mode);
            tooltip.select('.emission-rect')
                .style('background-color', co2intensity ? co2color(co2intensity) : 'gray');
            tooltip.select('.emission-intensity')
                .text(Math.round(co2intensity) || '?');
            var loadFactor = Math.round(d.production / d.capacity * 100) || '?';
            tooltip.select('#load-factor').text(
                loadFactor + ' %' +
                ' (' + (d.production || '?') + ' MW' +
                ' / ' + 
                (d.capacity || '?') + ' MW)');
        })
        .onProductionMouseMove(function(d) {
            d3.select('#countrypanel-production-tooltip')
                .style('transform',
                    'translate(' +
                        (d3.event.pageX + 10) + 'px' + ',' + 
                        (d3.event.pageY + 10) + 'px' +
                    ')');
        })
        .onProductionMouseOut(function (d) {
            co2Colorbar.currentMarker(undefined);
            d3.select('#countrypanel-production-tooltip')
                .style('display', 'none');
        });
}

function dataLoaded(err, state, argSolar, argWind) {
    if (err) {
        console.error(err);
        return;
    }

    // Populate with realtime country data
    d3.entries(state.countries).forEach(function(entry) {
        var countryCode = entry.key;
        var country = countries[countryCode];
        if (!country) {
            console.warn(countryCode + ' has no country definition.');
            return;
        }
        // Copy data
        d3.keys(entry.value).forEach(function(k) {
            country[k] = entry.value[k];
        });
        // Validate data
        if (!country.production) return;
        countryTable.PRODUCTION_MODES.forEach(function (mode) {
            if (mode == 'other' || mode == 'unknown') return;
            if (country.production[mode] === undefined)
                console.warn(countryCode + ' is missing production of ' + mode);
            else if (!country.capacity || country.capacity[mode] === undefined)
                console.warn(countryCode + ' is missing capacity of ' + mode);
        });
        if (!country.exchange || !d3.keys(country.exchange).length)
            console.warn(countryCode + ' is missing exchanges');
    });
    console.log('countries', countries);

    // Render country picker if we're on mobile
    if (isSmallScreen()) {
        var validCountries = d3.values(countries).filter(function(d) {
            return d.production;
        }).sort(function(x, y) {
            if (!x.co2intensity && !x.countryCode)
                return d3.ascending(x.fullname || x.countryCode,
                    y.fullname || y.countryCode);
            else
                return d3.ascending(x.co2intensity || Infinity,
                    y.co2intensity || Infinity);
        });
        var selector = d3.select('.country-picker-container p')
            .selectAll('a')
            .data(validCountries);
        var enterA = selector.enter().append('a');
        enterA
            .append('div')
            .attr('class', 'emission-rect')
        enterA
            .append('text')
        enterA
            .attr('href', '#')
            .append('i').attr('id', 'country-flag')
        selector.select('text')
            .text(function(d) { return ' ' + (d.fullname || d.countryCode) + ' '; })
        selector.select('div.emission-rect')
            .style('background-color', function(d) {
                return d.co2intensity ? co2color(d.co2intensity) : 'gray';
            });
        selector.select('i#country-flag')
            .attr('class', function(d) { 
                return 'flag-icon flag-icon-' + d.countryCode.toLowerCase();
            })
        selector.on('click', function(d) { return selectCountry(d.countryCode); });
    }

    // Render country map
    countryMap
        .data(d3.values(countries))
        .onSeaClick(function () { selectCountry(undefined); })
        .onCountryClick(function (d) { selectCountry(d.countryCode); })
        .onCountryMouseOver(function (d) { 
            d3.select(this)
                .style('opacity', 0.8)
                .style('cursor', 'pointer')
            if (d.co2intensity)
                co2Colorbar.currentMarker(d.co2intensity);
            var tooltip = d3.select('#country-tooltip');
            tooltip.style('display', 'inline');
            tooltip.select('i#country-flag')
                .attr('class', 'flag-icon flag-icon-' + d.countryCode.toLowerCase())
            tooltip.select('#country-code')
                .text(d.countryCode);
            tooltip.select('.emission-rect')
                .style('background-color', d.co2intensity ? co2color(d.co2intensity) : 'gray');
            tooltip.select('.country-emission-intensity')
                .text(Math.round(d.co2intensity) || '?');
        })
        .onCountryMouseMove(function (d) {
            var tooltip = d3.select('#country-tooltip');
            var w = tooltip.node().getBoundingClientRect().width;
            var h = tooltip.node().getBoundingClientRect().height;
            tooltip
                .style('transform',
                    'translate(' +
                        (d3.event.pageX - w - 5) + 'px' + ',' + 
                        (d3.event.pageY - h - 5) + 'px' +
                    ')');
        })
        .onCountryMouseOut(function (d) { 
            d3.select(this)
                .style('opacity', 1)
                .style('cursor', 'normal')
            if (d.co2intensity)
                co2Colorbar.currentMarker(undefined);
            d3.select('#country-tooltip')
                .style('display', 'none');
        })
        .render();

        // Render country table if it already was visible
        if (selectedCountryCode)
            countryTable.data(countries[selectedCountryCode]).render()

    if (!isSmallScreen()) {
        // Populate exchange pairs for arrows
        d3.entries(state.exchanges).forEach(function(obj) {
            var exchange = exchanges[obj.key];
            if (!exchange) {
                console.error('Missing exchange configuration for ' + obj.key);
                return;
            }
            // Copy data
            d3.keys(obj.value).forEach(function(k) {
                exchange[k] = obj.value[k];
            });
        });
        console.log('exchanges', exchanges);

        // Render exchanges
        exchangeLayer
            .data(d3.values(exchanges))
            .projection(countryMap.projection())
            .onExchangeMouseOver(function (d) { 
                d3.select(this)
                    .style('opacity', 0.8)
                    .style('cursor', 'pointer');
                if (d.co2intensity)
                    co2Colorbar.currentMarker(d.co2intensity);
                d3.select('#exchange-tooltip')
                    .style('display', 'inline');
            })
            .onExchangeMouseMove(function (d) {
                var tooltip = d3.select('#exchange-tooltip');
                var w = tooltip.node().getBoundingClientRect().width;
                var h = tooltip.node().getBoundingClientRect().height;
                tooltip
                    .style('left', (d3.event.pageX - w - 5) + 'px')
                    .style('top', (d3.event.pageY - h - 5) + 'px');
                tooltip.select('.emission-rect')
                    .style('background-color', d.co2intensity ? co2color(d.co2intensity) : 'gray');
                var i = d.netFlow > 0 ? 0 : 1;
                tooltip.select('span#from')
                    .text(d.countryCodes[i]);
                tooltip.select('span#to')
                    .text(d.countryCodes[(i + 1) % 2]);
                tooltip.select('span#flow')
                    .text(Math.abs(Math.round(d.netFlow)));
                tooltip.select('i#from')
                    .attr('class', 'flag-icon flag-icon-' + d.countryCodes[i].toLowerCase());
                tooltip.select('i#to')
                    .attr('class', 'flag-icon flag-icon-' + d.countryCodes[(i + 1) % 2].toLowerCase());
            })
            .onExchangeMouseOut(function (d) {
                d3.select(this)
                    .style('opacity', 1)
                    .style('cursor', 'normal')
                if (d.co2intensity)
                    co2Colorbar.currentMarker(undefined);
                d3.select('#exchange-tooltip')
                    .style('display', 'none');
            })
            .render();
    }

    // Render weather
    wind = argWind;
    solar = argSolar;

    if (!showWindOption)
        d3.select(d3.select('#checkbox-wind').node().parentNode).style('display', 'none');
    if (windEnabled && wind && wind['forecasts'][0] && wind['forecasts'][1]) {
        console.log('wind', wind);
        Wind.draw('.wind',
            customDate ? moment(customDate) : moment(new Date()),
            wind.forecasts[0],
            wind.forecasts[1],
            windColor,
            countryMap.projection());
        if (windEnabled)
            Wind.show();
        else
            Wind.hide();
    } else {
        Wind.hide();
        if (windEnabled) {
            windEnabled = false;
            d3.select('#checkbox-wind').attr('checked', false);
        }
    }

    if (!showSolarOption)
        d3.select(d3.select('#checkbox-solar').node().parentNode).style('display', 'none');
    if (solarEnabled && solar && solar['forecasts'][0] && solar['forecasts'][1]) {
        console.log('solar', solar);
        Solar.draw('.solar',
            customDate ? moment(customDate) : moment(new Date()),
            solar.forecasts[0],
            solar.forecasts[1],
            solarColor,
            countryMap.projection());
        if (solarEnabled)
            Solar.show();
        else
            Solar.hide();
    } else {
        Solar.hide();
        if (solarEnabled) {
            solarEnabled = false;
            d3.select('#checkbox-solar').attr('checked', false);
        }
    }

    stopLoading();
};

// Get geolocation is on mobile (in order to select country)
function geolocaliseCountryCode(callback) {
    // Deactivated for now (UX was confusing)
    callback(null, null);
    return;
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            d3.json('http://maps.googleapis.com/maps/api/geocode/json?latlng=' + position.coords.latitude + ',' + position.coords.longitude, function (err, response) {
                if (err) {
                    console.warn(err);
                    callback(null, null);
                    return;
                }
                var obj = response.results[0].address_components
                    .filter(function(d) { return d.types.indexOf('country') != -1; });
                if (obj.length)
                    callback(null, obj[0].short_name);
                else {
                    console.warn(Error('Invalid geocoder response'), response);
                    callback(null, null);
                }
            });
        }, function(err) { 
            console.warn(err);
            callback(null, null);
        });
    } else {
        console.warn(Error('Browser geolocation is not supported'));
        callback(null, null);
    }
}

// Periodically load data
var connectionWarningTimeout = null;

function handleConnectionReturnCode(err) {
    if (err) {
        catchError(err);
        document.getElementById('connection-warning').className = "show";
    } else {
        document.getElementById('connection-warning').className = "hide";
        clearInterval(connectionWarningTimeout);
    }
}

function ignoreError(func) {
    return function() {
        var callback = arguments[arguments.length - 1];
        arguments[arguments.length - 1] = function(err, obj) {
            if (err) {
                return callback(null, null);
            } else {
                return callback(null, obj);
            }
        }
        func.apply(this, arguments);
    }
}

function fetch(doReschedule, showLoading) {
    if (!doReschedule) doReschedule = false;
    if (!showLoading) showLoading = false;
    if (showLoading) startLoading();
    // If data doesn't load in 30 secs, show connection warning
    connectionWarningTimeout = setTimeout(function(){
        document.getElementById('connection-warning').className = "show";
    }, 15 * 1000);
    var Q = d3.queue()
    if (isMobile()) {
        Q.defer(d3.json, ENDPOINT + '/v1/state');
        Q.defer(geolocaliseCountryCode);
        Q.await(function(err, state, geolocalisedCountryCode) {
            handleConnectionReturnCode(err);
            if (!err) {
                dataLoaded(err, state.data);
            }
            if (doReschedule)
                setTimeout(fetchAndReschedule, REFRESH_TIME_MINUTES * 60 * 1000);
        });
    } else {
        Q.defer(d3.json, ENDPOINT + '/v1/state' + (customDate ? '?datetime=' + customDate : ''));
        Q.defer(solarEnabled ? ignoreError(DataService.fetchGfs) : DataService.fetchNothing,
            ENDPOINT, 'solar', customDate || new Date());
        Q.defer(windEnabled ? ignoreError(DataService.fetchGfs) : DataService.fetchNothing,
            ENDPOINT, 'wind', customDate || new Date());
        Q.await(function(err, state, solar, wind) {
            handleConnectionReturnCode(err);
            if (!err)
                dataLoaded(err, state.data, solar, wind);
            if (showLoading) stopLoading();
            if (doReschedule)
                setTimeout(fetchAndReschedule, REFRESH_TIME_MINUTES * 60 * 1000);
        });
    }
};

function fetchAndReschedule() { return fetch(true); };

function redraw() {
    countryTable.render();
    if (!isSmallScreen()) {
        countryMap.render();
        co2Colorbar.render();
        windColorbar.render();
        solarColorbar.render();
        exchangeLayer
            .projection(countryMap.projection())
            .render();
    }
};

window.onresize = function () {
    redraw();
};

fetchAndReschedule();
