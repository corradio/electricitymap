var exports = module.exports = {};

var d3 = require('d3');
var mathjs = require('mathjs');

var co2eq_parameters = require('./co2eq_parameters');

exports.compute = function(countries) {
    var validCountries = d3.values(countries)
        .filter(function (d) { return d.countryCode && d.production; })
        .filter(function (d) {
            // Double check that total production + import >= export
            return (d.totalProduction + d.totalImport) >= d.totalExport;
        })
        .filter(function (d) { return d.countryCode != 'NL'; });
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
    var A = mathjs.sparse().resize([n, n]);
    var b = mathjs.zeros(n);

    validCountries.forEach(function (country, i) {
        A.set([i, i], country.totalProduction + country.totalImport);
        // Intern
        d3.entries(country.production).forEach(function (production) {
            var footprint = co2eq_parameters.footprintOf(production.key, country.countryCode);
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
    var x = mathjs.lusolve(A, b);
    var assignments = {};
    x.toArray().forEach(function (x, i) {
        assignments[validCountries[i].countryCode] = x[0];
    });

    return assignments;
}
