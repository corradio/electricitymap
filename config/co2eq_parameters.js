var exports = module.exports = {};

const co2eqParameters = require('./co2eq_parameters.json');

exports.footprintOf = function(mode, zoneKey) {
  const defaultFootprint = co2eqParameters.emissionFactors.defaults[mode];
  const override = (co2eqParameters.emissionFactors.zoneOverrides[zoneKey] || {})[mode];
  return (override || defaultFootprint || {}).value;
};
exports.sourceOf = function(mode, zoneKey) {
  const defaultFootprint = co2eqParameters.emissionFactors.defaults[mode];
  const override = (co2eqParameters.emissionFactors.zoneOverrides[zoneKey] || {})[mode];
  return (override || defaultFootprint || {}).source;
};
exports.defaultExportIntensityOf = zoneKey =>
  (co2eqParameters.fallbackZoneMixes[zoneKey] || {}).carbonIntensity;
exports.defaultRenewableRatioOf = zoneKey =>
  (co2eqParameters.fallbackZoneMixes[zoneKey] || {}).renewableRatio;
exports.defaultFossilFuelRatioOf = zoneKey =>
  (co2eqParameters.fallbackZoneMixes[zoneKey] || {}).fossilFuelRatio;
exports.fossilFuelAccessor = (zoneKey, k, v) => {
  return (k == 'coal' ||
          k == 'gas' ||
          k == 'oil' ||
          (k === 'unknown' && (zoneKey !== 'GB-ORK' && zoneKey !== 'UA')) ||
          k == 'other') ? 1 : 0;
}
exports.renewableAccessor = (zoneKey, k, v) => {
  return (exports.fossilFuelAccessor(zoneKey, k, v) ||
          k === 'nuclear') ? 0 : 1;
  // TODO(bl): remove storage from renewable list?
}
