function Co2eqCalculator() {
    // Node dependencies
    if (typeof require != 'undefined') {
        d3 = require('d3');
        math = require('mathjs');
    }

    this.defaultCo2eqFootprint = {
        'biomass': 230,
        'coal': 820,
        'gas': 490,
        'hydro': 24,
        'nuclear': 12,
        'oil': 650,
        'solar': 45,
        'wind': 12,
        'unknown': 700, // assume conventional
        'other': 700 // same as 'unknown'. Here for backward compatibility
    }; // in gCo2eq/kWh

    this.countryCo2eqFootprint = {
        'DE': function (productionMode) {
            return (productionMode == 'unknown' || productionMode == 'other') ? 700 : null;
        },
        'DK': function (productionMode) {
            return (productionMode == 'unknown' || productionMode == 'other') ? 700 : null;
        },
        'FI': function (productionMode) {
            return (productionMode == 'unknown' || productionMode == 'other') ? 700 : null;
        },
        'GB': function (productionMode) {
            return (productionMode == 'unknown' || productionMode == 'other') ? 300 : null;
        },
        'NO': function (productionMode) {
            return (productionMode == 'unknown' || productionMode == 'other') ? 700 : null;
        },
        'SE': function (productionMode) {
            return (productionMode == 'unknown' || productionMode == 'other') ? 700 : null;
        }
    };

    this.footprintOf = function(productionMode, countryKey) {
        var defaultFootprint = this.defaultCo2eqFootprint[productionMode];
        var countryFootprint = this.countryCo2eqFootprint[countryKey] || function () { };
        return countryFootprint(productionMode) || defaultFootprint;
    };

    this.compute = function(countries) {
        var validCountries = d3.values(countries)
            .filter(function (d) { return d.countryCode && d.production; })
            .filter(function (d) {
                // Double check that total production + import >= export
                return (d.totalProduction + d.totalImport) >= d.totalExport;
            });
        var validCountryKeys = validCountries.map(function (d) { return d.countryCode });
        // x_i: unknown co2 (consumption) footprint of i-th country
        // f_ij: known co2 footprint of j-th system of i-th country
        // v_ij: power volume of j-th system of i-th country
        // CO2 mass flow balance equation for each country i:
        // x_i * (sum_j_intern(v_ij) + sum_j_import(v_ij) - sum_j_export(v_ij)) = 
        //     sum_j_intern(f_ij * v_ij)
        //   + sum_j_import(x_j * v_ij)
        //   - sum_j_export(v_ij) * x_i
        // Note that exports cancel out.
        
        // We wish to solve Ax = b
        var n = validCountries.length;
        var A = math.sparse().resize([n, n]);
        var b = math.zeros(n);

        var that = this;

        validCountries.forEach(function (country, i) {
            A.set([i, i], country.totalProduction + country.totalImport);
            // Intern
            d3.entries(country.production).forEach(function (production) {
                var footprint = that.footprintOf(production.key, country.countryCode);
                if (footprint === undefined) {
                    console.warn(country.countryCode + ' CO2 footprint of ' + production.key + ' is unknown');
                    return;
                }
                // Accumulate
                b.set([i], b.get([i]) + footprint * production.value);
            });
            // Exchanges
            if (country.exchange) {
                d3.entries(country.exchange).forEach(function (exchange) {
                    if (exchange.value > 0) {
                        var j = validCountryKeys.indexOf(exchange.key);
                        if (j < 0) {
                            if (typeof require == 'undefined')
                                console.warn(country.countryCode + ' neighbor ' + exchange.key + ' has no co2 data');
                            return;
                        }
                        // Import
                        A.set([i, j], -exchange.value);
                    }
                });
            }
        });

        // Solve
        var x = math.lusolve(A, b);
        this.assignments = {};
        x.toArray().forEach(function (x, i) {
            that.assignments[validCountries[i].countryCode] = x[0];
        });

        return this;
    }

    return this;
}

if (typeof module != 'undefined')
    module.exports = {
        Co2eqCalculator: Co2eqCalculator
    }
