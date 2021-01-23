import React from 'react';
import Moment from 'moment';
import { extendMoment } from 'moment-range';

import { __ } from '../../helpers/translation';

const moment = extendMoment(Moment);

const renderTickValue = (v, format) => (
  moment().diff(v, 'hours') < 1
    ? __('country-panel.now')
    : v.format(format)
);

const TimeAxis = React.memo(({ className, scale, transform }) => {
  const [x1, x2] = scale.range();

  const startMoment = moment(scale.domain()[0]);
  const endMoment = moment(scale.domain()[1]);
  let interval;
  let format;
  if (endMoment.diff(startMoment, 'years') > 1) {
    interval = 'year';
    format = 'YYYY';
  } else if (endMoment.diff(startMoment, 'months') > 1) {
    interval = 'month';
    format = 'MMM YYYY';
  } else {
    interval = 'hour';
    format = 'LT';
  }
  const range = moment.range(
    startMoment.startOf(interval).add(1, interval), // add one at the end to make sure it includes NOW
    endMoment,
  );
  const tickMoments = Array.from(range.by(interval, { step: interval === 'hour' ? 6 : 1 }));

  return (
    <g
      className={className}
      transform={transform}
      fill="none"
      fontSize="10"
      fontFamily="sans-serif"
      textAnchor="middle"
      style={{ pointerEvents: 'none' }}
    >
      <path className="domain" stroke="currentColor" d={`M${x1 + 0.5},6V0.5H${x2 + 0.5}V6`} />
      {tickMoments.map(v => (
        <g key={`tick-${v}`} className="tick" opacity={1} transform={`translate(${scale(v)},0)`}>
          <line stroke="currentColor" y2="6" />
          <text fill="currentColor" y="9" x="0" dy="0.71em">{renderTickValue(v, format)}</text>
        </g>
      ))}
    </g>
  );
});

export default TimeAxis;
