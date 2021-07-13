import React, {
  useMemo,
  useState,
} from 'react';
import {
  first,
  last,
  sortedIndex,
  isNumber,
} from 'lodash';
import { scaleTime } from 'd3-scale';
import moment from 'moment';

import TimeAxis from './graph/timeaxis';
import DaylightTimeAxis from './graph/daylighttimeaxis';
import { useRefWidthHeightObserver } from '../hooks/viewport';
import { useCurrentNightTimes } from '../hooks/redux';

const AXIS_HORIZONTAL_MARGINS = 12;

const getTimeScale = (width, datetimes, startTime, endTime) => scaleTime()
  .domain([
    startTime ? moment(startTime).toDate() : first(datetimes),
    endTime ? moment(endTime).toDate() : last(datetimes),
  ])
  .range([0, width]);

const createChangeAndInputHandler = (datetimes, onChange, setAnchoredTimeIndex) => (ev) => {
  const value = parseInt(ev.target.value, 10);
  let index = sortedIndex(datetimes.map(t => t.valueOf()), value);
  // If the slider is past the last datetime, we set index to null in order to use the scale end time.
  if (index >= datetimes.length) {
    index = null;
  }
  setAnchoredTimeIndex(index);
  if (onChange) {
    onChange(index);
  }
};

const TimeSlider = ({
  className,
  onChange,
  selectedTimeIndex,
  datetimes,
  startTime,
  endTime,
}) => {
  const { ref: ref1, width } = useRefWidthHeightObserver(2 * AXIS_HORIZONTAL_MARGINS);
  const { ref: ref2 } = useRefWidthHeightObserver(2 * AXIS_HORIZONTAL_MARGINS);

  const [anchoredTimeIndex, setAnchoredTimeIndex] = useState(null);
  const nightTimes = useCurrentNightTimes();

  const timeScale = useMemo(
    () => getTimeScale(width, datetimes, startTime, endTime),
    [width, datetimes, startTime, endTime],
  );

  const handleChangeAndInput = useMemo(
    () => createChangeAndInputHandler(datetimes, onChange, setAnchoredTimeIndex),
    [datetimes, onChange, setAnchoredTimeIndex],
  );

  if (!datetimes || datetimes.length === 0) return null;

  const selectedTimeValue = isNumber(selectedTimeIndex) ? datetimes[selectedTimeIndex].valueOf() : null;
  const anchoredTimeValue = isNumber(anchoredTimeIndex) ? datetimes[anchoredTimeIndex].valueOf() : null;
  const startTimeValue = timeScale.domain()[0].valueOf();
  const endTimeValue = timeScale.domain()[1].valueOf();

  return (
    <div className={className}>
      <svg className="time-slider-daylight-axis-container" ref={ref1}>
        <DaylightTimeAxis
          scale={timeScale}
          nightTimes={nightTimes}
          transform={`translate(${AXIS_HORIZONTAL_MARGINS}, 0)`}
          className="time-slider-axis"
        />
      </svg>
      <input
        type="range"
        className="time-slider-input"
        onChange={handleChangeAndInput}
        onInput={handleChangeAndInput}
        value={selectedTimeValue || anchoredTimeValue || endTimeValue}
        min={startTimeValue}
        max={endTimeValue}
      />
      <svg className="time-slider-axis-container" ref={ref2}>
        <TimeAxis
          scale={timeScale}
          transform={`translate(${AXIS_HORIZONTAL_MARGINS}, 0)`}
          className="time-slider-axis"
        />
      </svg>
    </div>
  );
};

export default TimeSlider;
