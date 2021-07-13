import moment from 'moment';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { keys, sortBy } from 'lodash';
import { getSunrise, getSunset } from 'sunrise-sunset-js';

import { useCustomDatetime } from './router';

import { getCenteredZoneViewport } from '../helpers/map';

export function useCurrentZoneHistory() {
  const { zoneId } = useParams();
  const histories = useSelector(state => state.data.histories);

  return useMemo(
    () => histories[zoneId] || [],
    [histories, zoneId],
  );
}

export function useCurrentZoneHistoryDatetimes() {
  const zoneHistory = useCurrentZoneHistory();

  return useMemo(
    () => zoneHistory.map(d => moment(d.stateDatetime).toDate()),
    [zoneHistory],
  );
}

// Use current time as the end time of the graph time scale explicitly
// as we want to make sure we account for the missing data at the end of
// the graph (when not inferable from historyData timestamps).
export function useCurrentZoneHistoryEndTime() {
  const customDatetime = useCustomDatetime();
  const gridDatetime = useSelector(state => (state.data.grid || {}).datetime);

  return useMemo(
    () => moment(customDatetime || gridDatetime).format(),
    [customDatetime, gridDatetime],
  );
}

// TODO: Likewise, we should be passing an explicit startTime set to 24h
// in the past to make sure we show data is missing at the beginning of
// the graph, but right now that would create UI inconsistency with the
// other neighbouring graphs showing data over a bit longer time scale
// (see https://github.com/tmrowco/electricitymap-contrib/issues/2250).
export function useCurrentZoneHistoryStartTime() {
  return null;
}

export function useCurrentZoneData() {
  const { zoneId } = useParams();
  const zoneHistory = useCurrentZoneHistory();
  const zoneTimeIndex = useSelector(state => state.application.selectedZoneTimeIndex);
  const grid = useSelector(state => state.data.grid);

  return useMemo(
    () => {
      if (!zoneId || !grid) {
        return null;
      }
      if (zoneTimeIndex === null) {
        return grid.zones[zoneId];
      }
      return zoneHistory[zoneTimeIndex];
    },
    [zoneId, zoneHistory, zoneTimeIndex, grid],
  );
}

export function useCurrentZoneExchangeKeys() {
  // Use the whole history (which doesn't depend on timestamp)
  // and fallback on current zone data
  const zoneHistory = useCurrentZoneHistory();
  const currentZoneData = useCurrentZoneData();
  const isConsumption = useSelector(state => state.application.electricityMixMode === 'consumption');

  return useMemo(
    () => {
      if (!isConsumption) {
        return [];
      }
      const exchangeKeys = new Set();
      const zoneHistoryOrCurrent = zoneHistory || [currentZoneData];
      zoneHistoryOrCurrent.forEach((zoneData) => {
        keys(zoneData.exchange).forEach(k => exchangeKeys.add(k));
      });
      return sortBy(Array.from(exchangeKeys));
    },
    [isConsumption, zoneHistory, currentZoneData],
  );
}

export function useLoadingOverlayVisible() {
  const mapInitializing = useSelector(state => state.application.isLoadingMap);
  const gridInitializing = useSelector(state => state.data.isLoadingGrid && !state.data.hasInitializedGrid);
  const solarInitializing = useSelector(state => state.data.isLoadingSolar && !state.data.solar);
  const windInitializing = useSelector(state => state.data.isLoadingWind && !state.data.wind);
  return mapInitializing || gridInitializing || solarInitializing || windInitializing;
}

export function useSmallLoaderVisible() {
  const gridLoading = useSelector(state => state.data.isLoadingGrid);
  const solarLoading = useSelector(state => state.data.isLoadingSolar);
  const windLoading = useSelector(state => state.data.isLoadingWind);
  return gridLoading || solarLoading || windLoading;
}

export function useCurrentNightTimes() {
  const { zoneId } = useParams();
  const zone = useSelector(state => state.data.grid.zones[zoneId]);
  const datetimeStr = useSelector(state => state.data.grid.datetime);
  const history = useCurrentZoneHistory();

  return useMemo(() => {
    if (!zone || !datetimeStr || !history || !history[0]) {
      return [];
    }
    const { latitude, longitude } = getCenteredZoneViewport(zone);
    const nightTimes = [];
    let baseDatetime = moment(datetimeStr).startOf('day').toDate();
    const earliest = history && history[0] && new Date(history[0].stateDatetime);
    const latest = new Date((history && history[history.length - 1])
      ? history[history.length - 1].stateDatetime
      : datetimeStr);
    do {
      // Get last nightTime
      const nightStart = getSunset(latitude, longitude, baseDatetime);
      let nightEnd = getSunrise(latitude, longitude, baseDatetime);
      // Due to some bug in the library, sometimes we get nightStart > nightEnd
      if (nightStart.getTime() > nightEnd.getTime()) {
        nightEnd = moment(nightEnd).add(1, 'day').toDate();
      }
      // Ignore nights that start after the latest time we have
      // or that finish before the earliest time we have
      if (nightStart.getTime() < latest.getTime() && nightEnd.getTime() > earliest.getTime()) {
        nightTimes.push([nightStart, nightEnd]);
      }

      // Abort at the first night that starts before our earliest time
      if (nightStart.getTime() < earliest.getTime()) {
        return nightTimes;
      }

      // Iterate to previous day
      baseDatetime = moment(baseDatetime).subtract(1, 'day').toDate();
    } while (true);
  }, [zone, datetimeStr, history]);
}
