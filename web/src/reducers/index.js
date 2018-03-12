import { combineReducers } from 'redux';

const Cookies = require('js-cookie');
const dataReducer = require('./dataReducer');

const isLocalhost = window.location.href.indexOf('electricitymap') !== -1 ||
  window.location.href.indexOf('192.') !== -1;

const initialApplicationState = {
  // Here we will store non-data specific state (to be sent in analytics and crash reporting)
  bundleHash: window.bundleHash,
  callerLocation: null,
  clientType: window.isCordova ? 'mobileapp' : 'web',
  colorBlindModeEnabled: Cookies.get('colorBlindModeEnabled') === 'true' || false,
  customDate: null,
  isCordova: window.isCordova,
  isEmbedded: window.top !== window.self,
  isProduction: window.location.href.indexOf('electricitymap') !== -1,
  isLocalhost,
  legendVisible: false,
  locale: window.locale,
  selectedZoneName: null,
  selectedZoneTimeIndex: null,
  solarEnabled: Cookies.get('solarEnabled') === 'true' || false,
  useRemoteEndpoint: document.domain === '' || isLocalhost,
  windEnabled: Cookies.get('windEnabled') === 'true' || false,
  

  // TODO(olc): refactor this state
  showPageState: 'map',
  pageToGoBackTo: null,
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
      if (key === 'showPageState' &&
          state.showPageState !== 'country') {
        newState.pageToGoBackTo = state.showPageState;
      }

      return newState;
    }

    default:
      return state;
  }
};

module.exports = combineReducers({
  application: applicationReducer,
  data: dataReducer,
});
