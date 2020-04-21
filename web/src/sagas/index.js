import { call, put, takeLatest } from 'redux-saga/effects';

import thirdPartyServices from '../services/thirdparty';
import { handleRequestError, protectedJsonRequest, textRequest } from '../helpers/api';
import {
  getGfsTargetTimeBefore,
  getGfsTargetTimeAfter,
  fetchGfsForecast,
} from '../helpers/gfs';

function* fetchClientVersion(action) {
  try {
    const version = yield call(textRequest, '/clientVersion');
    yield put({ type: 'APPLICATION_STATE_UPDATE', key: 'version', value: version });
  } catch (err) {
    handleRequestError(err);
  }
}

function* fetchZoneHistory(action) {
  const { zoneId } = action.payload;
  try {
    const payload = yield call(protectedJsonRequest, `/v3/history?countryCode=${zoneId}`);
    yield put({ type: 'ZONE_HISTORY_FETCH_SUCCEEDED', zoneId, payload });
  } catch (err) {
    yield put({ type: 'ZONE_HISTORY_FETCH_FAILED' });
    handleRequestError(err);
  }
}

function* fetchGridData(action) {
  const { datetime } = action.payload;
  try {
    const payload = yield call(protectedJsonRequest, datetime ? `/v3/state?datetime=${datetime}` : '/v3/state');
    thirdPartyServices.trackWithCurrentApplicationState('pageview');
    yield put({ type: 'APPLICATION_STATE_UPDATE', key: 'callerLocation', value: payload.callerLocation });
    yield put({ type: 'APPLICATION_STATE_UPDATE', key: 'callerZone', value: payload.callerZone });
    yield put({ type: 'GRID_DATA_FETCH_SUCCEEDED', payload });
  } catch (err) {
    yield put({ type: 'GRID_DATA_FETCH_FAILED' });
    handleRequestError(err);
  }
}

function* fetchSolarData(action) {
  const { datetime } = action.payload || {};
  try {
    const before = yield call(fetchGfsForecast, 'solar', getGfsTargetTimeBefore(datetime));
    const after = yield call(fetchGfsForecast, 'solar', getGfsTargetTimeAfter(datetime));
    yield put({ type: 'SOLAR_DATA_FETCH_SUCCEEDED', payload: { forecasts: [before, after] } });
  } catch (err) {
    yield put({ type: 'SOLAR_DATA_FETCH_FAILED' });
    handleRequestError(err);
  }
}

function* fetchWindData(action) {
  const { datetime } = action.payload || {};
  try {
    const before = yield call(fetchGfsForecast, 'wind', getGfsTargetTimeBefore(datetime));
    const after = yield call(fetchGfsForecast, 'wind', getGfsTargetTimeAfter(datetime));
    yield put({ type: 'WIND_DATA_FETCH_SUCCEEDED', payload: { forecasts: [before, after] } });
  } catch (err) {
    yield put({ type: 'WIND_DATA_FETCH_FAILED' });
    handleRequestError(err);
  }
}

export default function* () {
  yield takeLatest('GRID_DATA_FETCH_REQUESTED', fetchGridData);
  yield takeLatest('WIND_DATA_FETCH_REQUESTED', fetchWindData);
  yield takeLatest('SOLAR_DATA_FETCH_REQUESTED', fetchSolarData);
  yield takeLatest('ZONE_HISTORY_FETCH_REQUESTED', fetchZoneHistory);
  yield takeLatest('CLIENT_VERSION_FETCH_REQUESTED', fetchClientVersion);
}
