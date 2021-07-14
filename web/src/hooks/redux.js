import moment from 'moment';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { keys, sortBy } from 'lodash';

import { useCustomDatetime } from './router';

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
  const gridDatetime =
    useSelector((state) => (state.data.grid || {}).datetime) ||
    moment().subtract(2, 'hour').startOf('hour');

  return useMemo(
    () => moment(customDatetime || gridDatetime).format(),
    [customDatetime, gridDatetime]
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
  const zoneHistory = useCurrentZoneHistory() || [useCurrentZoneData()];
  const isConsumption = useSelector(state => state.application.electricityMixMode === 'consumption');

  return useMemo(
    () => {
      if (!isConsumption) {
        return [];
      }
      const exchangeKeys = new Set();
      zoneHistory.forEach((zoneData) => {
        keys(zoneData.exchange).forEach(k => exchangeKeys.add(k));
      });
      return sortBy(Array.from(exchangeKeys));
    },
    [isConsumption, zoneHistory],
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
