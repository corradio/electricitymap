import React from 'react';

// Return `count` timestamp values uniformly distributed within the scale
// domain, including both ends, rounded up to 15 minutes precision.
const getTicks = nightTimes => nightTimes.flatMap(([start, end]) => [
  [start, '🌙 sunset'],
  [end, '☀️ sunrise'],
]);

// Assumes the height of the component is 20, as given in the CSS

export default React.memo(({
  className, scale, transform, nightTimes,
}) => {
  const [x1, x2] = scale.range();
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
      {getTicks(nightTimes).map(([dt, label]) => (
        <g key={`tick-${dt}`} className="tick" opacity={1} transform={`translate(${scale(dt)},0)`}>
          <line stroke="currentColor" y1="14" y2="20" />
          <text fill="currentColor" y="0" x="0" dy="0.71em">{label}</text>
        </g>
      ))}
    </g>
  );
});
