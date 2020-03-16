import { combineReducers } from 'redux';

const dataReducer = require('./dataReducer');
const { getKey } = require('../helpers/storage');

const isLocalhost = window.location.href.indexOf('electricitymap') !== -1
  || window.location.href.indexOf('192.') !== -1;

const cookieGetBool = (key, defaultValue) => {
  const val = getKey(key);
  if (val == null) {
    return defaultValue;
  }
  return val === 'true';
};

const initialApplicationState = {
  // Here we will store non-data specific state (to be sent in analytics and crash reporting)
  bundleHash: window.bundleHash,
  version: VERSION,
  callerLocation: null,
  callerZone: null,
  centeredZoneName: null,
  clientType: window.isCordova ? 'mobileapp' : 'web',
  co2ColorbarMarker: undefined,
  colorBlindModeEnabled: cookieGetBool('colorBlindModeEnabled', false),
  brightModeEnabled: cookieGetBool('brightModeEnabled', true),
  customDate: null,
  electricityMixMode: 'consumption',
  isCordova: window.isCordova,
  isEmbedded: window.top !== window.self,
  isLeftPanelCollapsed: false,
  isMobile:
  (/android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i).test(navigator.userAgent),
  isProduction: window.location.href.indexOf('electricitymap') !== -1,
  isLocalhost,
  legendVisible: true,
  locale: window.locale,
  onboardingSeen: cookieGetBool('onboardingSeen', false),
  tooltipDisplayMode: null,
  tooltipPosition: { x: 0, y: 0 },
  tooltipZoneData: null,
  searchQuery: null,
  selectedZoneName: null,
  selectedZoneTimeIndex: null,
  solarEnabled: cookieGetBool('solarEnabled', false),
  useRemoteEndpoint: document.domain === '' || isLocalhost,
  windEnabled: cookieGetBool('windEnabled', false),

  // TODO(olc): refactor this state
  showPageState: 'map',
  pageToGoBackTo: null,
  // TODO(olc): those properties could be deduced from a `hoveredZoneName`
  tooltipLowCarbonGaugePercentage: null,
  tooltipRenewableGaugePercentage: null,
  // TODO(olc): move this to countryPanel once all React components have been made
  tableDisplayEmissions: false,
};

const applicationReducer = (state = initialApplicationState, action) => {
  switch (action.type) {
    case 'APPLICATION_STATE_UPDATE': {
      const { key, value } = action;
      const newState = Object.assign({}, state);
      newState[key] = value;

      // Disabled for now (see TODO in main.js)
      // if (key === 'selectedZoneName') {
      //   newState.showPageState = value ? 'country' : 'map';
      // }
      if (key === 'showPageState'
          && state.showPageState !== 'country') {
        newState.pageToGoBackTo = state.showPageState;
      }

      if (key === 'electricityMixMode' && ['consumption', 'production'].indexOf(value) === -1) {
        throw Error(`Unknown electricityMixMode "${value}"`);
      }

      return newState;
    }

    case 'GRID_DATA': {
      const selectedZoneNameExists = Object.keys(action.payload.countries)
        .indexOf(state.selectedZoneName) !== -1;
      if (state.selectedZoneName != null && !selectedZoneNameExists) {
        // The selectedZoneName doesn't exist anymore, we need to reset it
        // TODO(olc): the page state should be inferred from selectedZoneName
        return Object.assign({}, state, {
          selectedZoneName: undefined,
          showPageState: state.pageToGoBackTo || 'map',
        });
      }
      return state;
    }

    case 'SHOW_TOOLTIP': {
      return Object.assign({}, state, {
        tooltipDisplayMode: action.payload.displayMode,
        tooltipPosition: action.payload.position,
        tooltipZoneData: action.payload.zoneData,
      });
    }

    case 'HIDE_TOOLTIP': {
      return Object.assign({}, state, {
        tooltipDisplayMode: null,
      });
    }

    case 'SET_CO2_COLORBAR_MARKER': {
      const co2ColorbarMarker = action.payload.marker;
      if (co2ColorbarMarker !== state.co2ColorbarMarker) {
        return Object.assign({}, state, { co2ColorbarMarker });
      }
      return state;
    }

    case 'UNSET_CO2_COLORBAR_MARKER': {
      return Object.assign({}, state, {
        co2ColorbarMarker: undefined,
      });
    }

    case 'UPDATE_SELECTED_ZONE': {
      const { selectedZoneName } = action.payload;
      return Object.assign({}, state, {
        selectedZoneName,
        selectedZoneTimeIndex: null,
      });
    }

    case 'UPDATE_SLIDER_SELECTED_ZONE_TIME': {
      const { selectedZoneTimeIndex } = action.payload;
      // Update the selection only if it has changed
      if (selectedZoneTimeIndex !== state.selectedZoneTimeIndex) {
        return Object.assign({}, state, { selectedZoneTimeIndex });
      }
      return state;
    }

    default:
      return state;
  }
};

export default combineReducers({
  application: applicationReducer,
  data: dataReducer,
});
