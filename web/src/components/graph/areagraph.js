import React, { useMemo } from 'react';
import {
  first,
  last,
  max,
  min,
  filter,
  flattenDeep,
  isFinite,
  isEmpty,
} from 'lodash';
import { scaleTime, scaleLinear } from 'd3-scale';
import { stack, stackOffsetDiverging } from 'd3-shape';
import moment from 'moment';

import AreaGraphLayers from './areagraphlayers';
import GraphBackground from './graphbackground';
import GraphHoverLine from './graphhoverline';
import ValueAxis from './valueaxis';
import TimeAxis from './timeaxis';
import { useRefWidthHeightObserver } from '../../hooks/viewport';

const X_AXIS_HEIGHT = 20;
const Y_AXIS_WIDTH = 40;
const Y_AXIS_PADDING = 4;

const getDatetimes = data => (data || []).map(d => d.datetime);

const getTimeScale = (width, datetimes, startTime, endTime) => scaleTime()
  .domain([
    startTime ? moment(startTime).toDate() : first(datetimes),
    endTime ? moment(endTime).toDate() : last(datetimes),
  ])
  .range([0, width]);

const getTotalValues = (layers) => {
  const values = filter(
    flattenDeep(
      layers.map(
        layer => layer.datapoints.map(d => d[1]),
      ),
    ),
    isFinite,
  );
  return {
    min: min(values) || 0,
    max: max(values) || 0,
  };
};

const getValueScale = (height, totalValues) => scaleLinear()
  .domain([
    Math.min(0, 1.1 * totalValues.min),
    Math.max(0, 1.1 * totalValues.max),
  ])
  .range([height, Y_AXIS_PADDING]);

const getLayers = (data, layerKeys, layerStroke, layerFill, markerFill) => {
  if (!data || !data[0]) return [];
  const stackedData = stack()
    .offset(stackOffsetDiverging)
    .keys(layerKeys)(data);
  return layerKeys.map((key, ind) => ({
    key,
    stroke: layerStroke ? layerStroke(key) : 'none',
    fill: layerFill(key),
    markerFill: markerFill ? markerFill(key) : layerFill(key),
    datapoints: stackedData[ind],
  }));
};

const AreaGraph = React.memo(({
  /*
    `data` should be an array of objects, each containing:
      * a numerical value for every key appearing in `layerKeys`
      * `datetime` timestamp
  */
  data,
  /*
    `layerKey` should be an array of strings denoting the graph layers (in bottom-to-top order).
  */
  layerKeys,
  /*
    `layerStroke` should be a function mapping each layer key into a string value representing the layer's stroke color.
  */
  layerStroke,
  /*
    `layerFill` should be a function that maps each layer key into one of the following:
      * a string value representing the layer's fill color if it's homogenous
      * a function mapping each layer's data point to a string color value, rendering a horizontal gradient
  */
  layerFill,
  /*
    `markerFill` is an optional prop of that same format that overrides `layerFill` for the graph focal point fill.
  */
  markerFill,
  /*
    `startTime` and `endTime` are timestamps denoting the time interval of the rendered part of the graph.
    If not provided, they'll be inferred from timestamps of the first/last datapoints.
  */
  startTime,
  endTime,
  /*
    `valueAxisLabel` is a string label for the values (Y-axis) scale.
  */
  valueAxisLabel,
  /*
    Mouse event callbacks for the graph background and individual layers respectively.
  */
  backgroundMouseMoveHandler,
  backgroundMouseOutHandler,
  layerMouseMoveHandler,
  layerMouseOutHandler,
  /*
    Marker hooks that get called when the marker selection gets updated or hidden
  */
  markerUpdateHandler,
  markerHideHandler,
  /*
    `selectedTimeIndex` is am integer value representing the time index of the datapoint in focus.
  */
  selectedTimeIndex,
  /*
    `selectedLayerIndex` is an integer value representing the layer index of the datapoint in focus.
  */
  selectedLayerIndex,
  /*
    If `isMobile` is true, the mouse hover events are triggered by clicks only.
  */
  isMobile,
  /*
    Height of the area graph canvas.
  */
  height = '10em',
}) => {
  const {
    ref,
    width: containerWidth,
    height: containerHeight,
    node,
  } = useRefWidthHeightObserver(Y_AXIS_WIDTH, X_AXIS_HEIGHT);

  // Build layers
  const layers = useMemo(
    () => getLayers(data, layerKeys, layerStroke, layerFill, markerFill),
    [data, layerKeys, layerStroke, layerFill, markerFill],
  );

  // Generate graph scales
  const totalValues = useMemo(() => getTotalValues(layers), [layers]);
  const valueScale = useMemo(
    () => getValueScale(containerHeight, totalValues),
    [containerHeight, totalValues],
  );
  const datetimes = useMemo(() => getDatetimes(data), [data]);
  const timeScale = useMemo(
    () => getTimeScale(containerWidth, datetimes, startTime, endTime),
    [containerWidth, datetimes, startTime, endTime],
  );

  // Don't render the graph at all if no layers are present
  if (isEmpty(layers)) return null;

  return (
    <svg height={height} ref={ref} style={{ overflow: 'visible' }}>
      <GraphBackground
        timeScale={timeScale}
        valueScale={valueScale}
        datetimes={datetimes}
        mouseMoveHandler={backgroundMouseMoveHandler}
        mouseOutHandler={backgroundMouseOutHandler}
        isMobile={isMobile}
        svgNode={node}
      />
      <AreaGraphLayers
        layers={layers}
        datetimes={datetimes}
        timeScale={timeScale}
        valueScale={valueScale}
        mouseMoveHandler={layerMouseMoveHandler}
        mouseOutHandler={layerMouseOutHandler}
        isMobile={isMobile}
        svgNode={node}
      />
      <TimeAxis
        scale={timeScale}
        transform={`translate(-1 ${containerHeight - 1})`}
        className="x axis"
      />
      <ValueAxis
        scale={valueScale}
        label={valueAxisLabel}
        width={containerWidth}
        height={containerHeight}
      />
      <GraphHoverLine
        layers={layers}
        timeScale={timeScale}
        valueScale={valueScale}
        datetimes={datetimes}
        markerUpdateHandler={markerUpdateHandler}
        markerHideHandler={markerHideHandler}
        selectedLayerIndex={selectedLayerIndex}
        selectedTimeIndex={selectedTimeIndex}
        svgNode={node}
      />
    </svg>
  );
});

export default AreaGraph;
