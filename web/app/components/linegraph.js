'use strict';

var d3 = require('d3');
var moment = require('moment');

function LineGraph(selector, xAccessor, yAccessor, definedAccessor) {
    this.rootElement = d3.select(selector);
    this.graphElement = this.rootElement.append('g');
    this.interactionRect = this.graphElement.append('rect')
        .style('cursor', 'pointer')
        .style('opacity', 0);
    this.verticalLine = this.rootElement.append('line')
        .style('display', 'none')
        .style('pointer-events', 'none')
        .style('stroke-width', 1)
        .style('opacity', 0.3)
        .style('shape-rendering', 'crispEdges')
        .style('stroke', 'black');
    this.markerElement = this.rootElement.append('circle')
        .style('fill', 'black')
        .style('pointer-events', 'none')
        .attr('r', 6)
        .style('stroke', 'black')
        .style('stroke-width', 1.5);

    this.xAccessor = xAccessor;
    this.yAccessor = yAccessor;
    this.definedAccessor = definedAccessor;
    this._gradient = true;

    // Create axis
    this.xAxisElement = this.rootElement.append('g')
        .attr('class', 'x axis')
        .style('pointer-events', 'none');
    this.yAxisElement = this.rootElement.append('g')
        .attr('class', 'y axis')
        .style('pointer-events', 'none');

    // Create scales
    var x, y;
    this.x = x = d3.scaleTime();
    this.y = y = d3.scaleLinear();

    // Create line
    this.line = d3.line()
        .x(function(d, i) { return x(xAccessor(d, i)); })
        .y(function(d, i) { return y(yAccessor(d, i)); })
        .defined(definedAccessor)
        .curve(d3.curveMonotoneX);

    // Create area for fill
    this.area = d3.area()
        .x(function(d, i) { return x(xAccessor(d, i)); })
        .y0(function(d, i) { return y.range()[0] })
        .y1(function(d, i) { return y(yAccessor(d, i)); })
        .defined(definedAccessor)
        .curve(d3.curveMonotoneX);

    // Interaction state
    this.frozen = false;
    this._selectedIndex;
}

LineGraph.prototype.data = function (arg) {
    if (!arguments.length) return this._data;

    this._data = arg;

    // Cache xAccessor
    this.datetimes = this._data.map(this.xAccessor);

    // Update x-domain based on data
    if (this._data && this._data.length) {
        this.x.domain(
            d3.extent([
              this.xAccessor(this._data[0]),
              this.xAccessor(this._data[this._data.length - 1])]));
    }

    return this;
}

LineGraph.prototype.render = function () {
    // Convenience
    var that = this,
        x = this.x,
        y = this.y,
        z = this.z,
        stack = this.stack,
        data = this._data,
        datetimes = this.datetimes;

    if (!data) { return; }

    // Set scale range, based on effective pixel size
    var width  = this.rootElement.node().getBoundingClientRect().width,
        height = this.rootElement.node().getBoundingClientRect().height;
    if (!width || !height) return this;
    var X_AXIS_HEIGHT = 20;
    var X_AXIS_PADDING = 4;
    var Y_AXIS_WIDTH = 35;
    var Y_AXIS_PADDING = 4;
    x.range([0, width - Y_AXIS_WIDTH]);
    y.range([height - X_AXIS_HEIGHT, Y_AXIS_PADDING]);

    this.verticalLine
        .attr('y1', 0)
        .attr('y2', height);

    var selection = this.graphElement
        .selectAll('.layer')
        .data([data]) // only one time series for now
    var layer = selection.enter().append('g')
        .attr('class', 'layer');

    // Append fill path
    var areaPath = layer.append('path')
        .attr('class', 'area')
        .style('stroke', 'none')
        .style('pointer-events', 'none')
    if (this._gradient) {
        areaPath
            .style('fill', 'url(#linegraph-carbon-gradient)');
    }
    layer.merge(selection).select('path.area')
        .transition()
        .attr('d', this.area);

    // Append stroke path
    layer.append('path')
        .attr('class', 'line')
        .style('fill', 'none')
        .style('stroke-width', 1.5)
        .style('pointer-events', 'none');
    layer.merge(selection).select('path.line')
        .transition()
        .attr('d', this.line);


    var i = this._selectedIndex || (data.length - 1);
    if (data.length && data[i] && that.definedAccessor(data[i])) {
        this.markerElement
            .style('display', 'block')
            .attr('cx', x(datetimes[i]))
            .attr('cy', y(that.yAccessor(data[i])))
            .style('fill', that.yColorScale()(
                that.yAccessor(data[i])));
        that.verticalLine
            .attr('x1', x(datetimes[i]))
            .attr('x2', x(datetimes[i]));
    } else {
        this.markerElement.style('display', 'none');
    }

    this.verticalLine
        .attr('y1', y.range()[0])
        .attr('y2', y.range()[1]);

    if (this._gradient) {
        // Create gradient
        if (!this.gradientEl) {
            this.gradientEl = this.rootElement.append('linearGradient')
                .attr('id', 'linegraph-carbon-gradient')
                .attr('gradientUnits', 'userSpaceOnUse')
        }
        var selection = this.gradientEl
            .attr('x1', x.range()[0])
            .attr('x2', x.range()[1])
            .selectAll('stop')
            .data(data)
        var gradientData = selection
            .enter().append('stop');
        gradientData.merge(selection)
            .attr('offset', function(d, i) {
                return (that.x(that.xAccessor(d)) - that.x.range()[0]) /
                    (that.x.range()[1] - that.x.range()[0]) * 100.0 + '%';
            })
            .attr('stop-color', function(d) {
                return that.yColorScale()(
                    that.yAccessor(d));
            });
    }

    var isMobile = 
        (/android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i).test(navigator.userAgent);

    function drag() {
        if (!datetimes.length) return;
        var dx = d3.event.pageX ? (d3.event.pageX - this.getBoundingClientRect().left) :
            (d3.touches(this)[0][0]);
        var datetime = x.invert(dx);
        // Find data point closest to
        var i = d3.bisectLeft(datetimes, datetime);
        if (i > 0 && datetime - datetimes[i-1] < datetimes[i] - datetime)
            i--;
        if (i > datetimes.length - 1) i = datetimes.length - 1;
        that.selectedIndex(i);
        that.verticalLine
            .attr('x1', x(datetimes[i]))
            .attr('x2', x(datetimes[i]));
        if (!that.definedAccessor(data[i])) {
            // Not defined, hide the marker
            that.markerElement
                .style('display', 'none');
        } else {
            that.markerElement
                .style('display', 'block')
                .attr('cx', x(datetimes[i]))
                .attr('cy', y(that.yAccessor(data[i])))
                .style('fill', that.yColorScale()(
                    that.yAccessor(data[i])));
        }
    }

    this.interactionRect
        .attr('x', x.range()[0])
        .attr('y', y.range()[1])
        .attr('width', x.range()[1] - x.range()[0])
        .attr('height', y.range()[0] - y.range()[1])
        .on(isMobile ? 'touchstart' : 'mouseover', function () {
            if (!datetimes.length) return;
            // Always unfreeze on mobile
            if (isMobile) {
                that.frozen = true; that.togglefreeze();
            }
            that.verticalLine.style('display', 'block');
            if (that.mouseOverHandler)
                that.mouseOverHandler.call(this, undefined, that._selectedIndex);
        })
        .on(isMobile ? 'touchend' : 'mouseout', function () {
            if (!datetimes.length) return;
            if (that.frozen) return;
            // Always freeze on mobile
            if (isMobile) {
                that.frozen = false; that.togglefreeze();

                return;
            }
            that.verticalLine.style('display', 'none');
            that._selectedIndex = undefined;
            if (that.definedAccessor(data[data.length - 1])) {
                that.markerElement
                    .style('display', 'block')
                    .attr('cx', x(datetimes[datetimes.length - 1]))
                    .attr('cy', y(that.yAccessor(data[data.length - 1])))
                    .style('fill', that.yColorScale()(
                        that.yAccessor(data[data.length - 1])));
            } else {
                that.markerElement
                    .style('display', 'none');
            }
            if (that.mouseOutHandler)
                that.mouseOutHandler.call(this, undefined, that._selectedIndex);
        })
        .on(isMobile ? 'touchmove' : 'mousemove', function () {
            if (that.frozen) return;
            drag.call(this);
            if (that.mouseMoveHandler)
                that.mouseMoveHandler.call(this, data[that._selectedIndex], that._selectedIndex);
        })
        .on('click', function() {
            if (!isMobile) {
                that.togglefreeze();
                if (!that.frozen) {
                    drag.call(this);
                    if (that.mouseMoveHandler)
                        that.mouseMoveHandler.call(this, data[that._selectedIndex]);
                }
            } else {
                drag.call(this);
                if (that.mouseMoveHandler)
                    that.mouseMoveHandler.call(this, data[that._selectedIndex]);
            }
        });

    // x axis
    var xAxis = d3.axisBottom(x)
        .ticks(5)
        .tickFormat(function(d) { return moment(d).format('LT'); });
    this.xAxisElement
        // Need to remove 1px in order to see the 1px line
        .style('transform', 'translate(0, ' + (height - X_AXIS_HEIGHT) + 'px)')
        .call(xAxis);

    // y axis
    var yAxis = d3.axisRight(y)
        .ticks(5);
    this.yAxisElement
        .style('transform', 'translate(' + (width - Y_AXIS_WIDTH) + 'px, 0)')
        .call(yAxis);

    return this;
}

LineGraph.prototype.yColorScale = function(arg) {
    if (!arguments.length) return this._yColorScale;
    else this._yColorScale = arg;
    return this;
};

LineGraph.prototype.togglefreeze = function() {
    if (!this.frozen && !this._selectedIndex) {
        console.warn('Can only freeze if a selectedIndex is provided');
        return this;
    }
    this.frozen = !this.frozen;
    if (!this.frozen) this._selectedIndex = undefined;
    this.markerElement.style('stroke',
        this.frozen ? 'red' : 'black');
    return this;
}

LineGraph.prototype.onMouseOver = function(arg) {
    if (!arguments.length) return this.mouseOverHandler;
    else this.mouseOverHandler = arg;
    return this;
}
LineGraph.prototype.onMouseOut = function(arg) {
    if (!arguments.length) return this.mouseOutHandler;
    else this.mouseOutHandler = arg;
    return this;
}
LineGraph.prototype.onMouseMove = function(arg) {
    if (!arguments.length) return this.mouseMoveHandler;
    else this.mouseMoveHandler = arg;
    return this;
}
LineGraph.prototype.gradient = function(arg) {
    if (!arguments.length) return this._gradient;
    else this._gradient = arg;
    return this;
}
LineGraph.prototype.selectedIndex = function(arg) {
    if (!arguments.length) return this._selectedIndex;
    else {
        this._selectedIndex = arg;
        if (!this._data) { return this; }
        if (this._selectedIndex == null) { this._selectedIndex = this._data.length - 1; }
        this.verticalLine
            .attr('x1', this.x(this.xAccessor(this._data[this._selectedIndex])))
            .attr('x2', this.x(this.xAccessor(this._data[this._selectedIndex])))
            .style('display', this._selectedIndex == this._data.length ?
                'none' : 'block');
    }
    return this;
}

module.exports = LineGraph;
