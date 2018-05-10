var exports = module.exports = {};

var defaultCo2eqSource = 'IPCC 2014';

var defaultCo2eqSourceUnknown = 'assumes thermal (coal, gas, oil or biomass)';

var defaultCo2eqFootprint = { // in gCo2eq/kWh
    'biomass': {
      'value': 230,
      'source': defaultCo2eqSource
    },
    'coal': {
      'value': 820,
      'source': defaultCo2eqSource
    },
    'gas': {
      'value': 490,
      'source': defaultCo2eqSource
    },
    'hydro': {
      'value': 24,
      'source': defaultCo2eqSource
    },
    'hydro discharge': { // This applies to discharge only
      'value': 24,
      'source': defaultCo2eqSource
    },
    'battery discharge': { // This applies to discharge only
      'value': 0,
      'source': 'TODO'
    },
    'nuclear': {
      'value': 12,
      'source': defaultCo2eqSource
    },
    'oil': {
      'value': 650,
      'source': 'UK POST 2014' // UK Parliamentary Office of Science and Technology (2006) "Carbon footprint of electricity generation"
    },
    'solar': {
      'value': 45,
      'source': defaultCo2eqSource
    },
    'wind': {
      'value': 11,
      'source': defaultCo2eqSource
    },
    'geothermal': {
      'value': 38,
      'source': defaultCo2eqSource
    },
    'unknown': {
      'value': 700, // assume conventional
      'source': defaultCo2eqSourceUnknown
    },
    'other': {
      'value': 700, // // same as 'unknown'. Here for backward compatibility
      'source': defaultCo2eqSourceUnknown
    }
};

var countryCo2eqFootprint = {
    'DE': function (productionMode) {
        return (productionMode == 'unknown' || productionMode == 'other') ? {value: 700, source: null} : null;
    },
    'DK': function (productionMode) {
        return (productionMode == 'unknown' || productionMode == 'other') ? {value: 700, source: null} : null;
    },
    'EE': function (productionMode) {
        if (productionMode == 'oil') {
            // Estonian Shale Oil LCA emissions. Source: Issue #278; EASAC (2007) "A study on the EU oil shale industry – viewed in the light of the Estonian experience",
            return {value: 1515, source: 'EASAC 2007'};
        } else if (productionMode == 'unknown' || productionMode == 'other') {
            return {value: 700, source: null};
        };
    },
    'FI': function (productionMode) {
        return (productionMode == 'unknown' || productionMode == 'other') ? {value: 700, source: null} : null;
    },
    'NL': function (productionMode) {
        return (productionMode == 'unknown' || productionMode == 'other') ? {value: 563, source: 'assumes 57% gas, 33% coal, 5% biomass, 4% nuclear'} : null;
    },  // Source: Derived from 2017 annual average: coal  30.0%, co-generation(gas)  19.0%, gas 28.0%, coke-oven-gas 5.0%, nuclear 4.0%, Wind  7.7%, biomass (waste) 4.90%, solar 1.40%, accoring to http://en-tran-ce.org/newsletter-renewable-energy-in-the-netherlands/
    'NO': function (productionMode) {
        if (productionMode == 'hydro') {
            // Source: Ostford Research (2015) "The inventory and life cycle data for Norwegian hydroelectricity"
            return {value: 1.9, source: 'Ostford Research 2015'};
        } else if (productionMode == 'unknown' || productionMode == 'other') {
            return {value: 700, source: null};
        };
    },
    'SE': function (productionMode) {
        return (productionMode == 'unknown' || productionMode == 'other') ? {value: 362, source: 'assumes 72% biomass, 28% conventional thermal'} : null;
    },
    'RU': function (productionMode) {
        // Assumes weighted average emission factor based on 2015-TWh production: 22.7% * 820 g/kWh (coal) + 1.4% * 650 g/kWh (oil) + 75.8% * 490 g/kWh (gas) = 567 g/kWh
        // 2015 production source: https://www.iea.org/statistics/statisticssearch/report/?country=Russia&product=electricityandheat
        return (productionMode == 'unknown' || productionMode == 'other') ? {value: 567, source: 'assumes 76% gas, 23% coal, 1% oil'} : null;
    }
};

var defaultExportCo2eqFootprint = {
  'AL': {
        carbonIntensity: 24,
        renewableRatio: 1.00,
        fossilFuelRatio: 0.00,
        source: 'IEA yearly data for 2015',
        url: 'https://www.iea.org/statistics/statisticssearch/report/?country=ALBANIA&product=electricityandheat&year=2015'
    },
    'AZ': {
        carbonIntensity: 470,
        renewableRatio: 0.07,
        fossilFuelRatio: 0.92,
        source: 'IEA yearly data for 2015',
        url: 'https://www.iea.org/statistics/statisticssearch/report/?country=AZERBAIJAN&product=electricityandheat&year=2015'
    },
    'CA-BC': {
        carbonIntensity: 47,
        renewableRatio: 0.97,
        fossilFuelRatio: 0.03,
        source: 'List of Generating Stations in BC (Wikipedia) / IPCC 2014 Emissions Factors By Source',
        url: 'https://en.wikipedia.org/wiki/List_of_generating_stations_in_British_Columbia',
        comment: 'Average carbon intensity using 2016 mean production per fuel source (88% hydro, 9% biomass, 1% wind, 1% gas) and IPCC 2014 default lifecycle emission factors'
    },
    'CA-NB': {
        carbonIntensity: 300,
        renewableRatio: 0.27,
        fossilFuelRatio: 0.40,
        source: 'Canada NEB yearly data for 2016',
        url: 'https://www.neb-one.gc.ca/nrg/ntgrtd/mrkt/nrgsstmprfls/nb-eng.html'
    },
    'CA-QC': {
        carbonIntensity: 30,
        renewableRatio: 0.98,
        fossilFuelRatio: 1 - 0.98,
        source: 'StatCan CANSIM Table 127-0002 for 2011-2015',
        comment: 'see http://piorkowski.ca/rev/2017/06/canadian-electricity-co2-intensities/ and https://gist.github.com/jarek/bb06a7e1c5d9005b29c63562ac812ad7',
        comment2: 'not using NEB data here since the NEB resolution is 1% which makes a difference at these scales'
    },
    'ZA': {
        carbonIntensity: 750,
        renewableRatio: 0.03,
        fossilFuelRatio: 0.92,
        source: 'IEA yearly data for 2015',
        url: 'https://www.iea.org/statistics/statisticssearch/report/?country=SOUTHAFRIC&product=electricityandheat&year=2015'
    },
    'ZM': {
        carbonIntensity: 50,
        renewableRatio: 0.97,
        fossilFuelRatio: 0.03,
        source: 'IEA yearly data for 2015',
        url: 'https://www.iea.org/statistics/statisticssearch/report/?country=ZAMBIA&product=electricityandheat&year=2015'
    }
}

exports.footprintOf = function(productionMode, countryKey) {
    var defaultFootprint = defaultCo2eqFootprint[productionMode];
    var countryFootprint = countryCo2eqFootprint[countryKey] || function () { };
    var item = countryFootprint(productionMode) || defaultFootprint;
    return (item || {}).value;
};
exports.sourceOf = function(productionMode, countryKey) {
    var defaultFootprint = defaultCo2eqFootprint[productionMode];
    var countryFootprint = countryCo2eqFootprint[countryKey] || function () { };
    var item = countryFootprint(productionMode) || defaultFootprint;
    return (item || {}).source;
}
exports.defaultExportIntensityOf = zoneKey =>
  (defaultExportCo2eqFootprint[zoneKey] || {}).carbonIntensity;
exports.defaultRenewableRatioOf = zoneKey =>
  (defaultExportCo2eqFootprint[zoneKey] || {}).renewableRatio;
exports.defaultFossilFuelRatioOf = zoneKey =>
  (defaultExportCo2eqFootprint[zoneKey] || {}).fossilFuelRatio;
