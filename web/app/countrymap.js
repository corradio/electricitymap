var d3 = require('d3');

function CountryMap(selector, co2color) {
    var that = this;

    this.STROKE_WIDTH = 0.3;

    this.selectedCountry = undefined;
    this._center = undefined;

    this.root = d3.select(selector)
        .style('transform-origin', '0px 0px')
        .style('transform', 'translate(0px,0px) scale(1)'); // Safari bug causes map to appear on top of other things unless translated
    // Add SVG layer
    this.svg = this.root.append('svg')
        .attr('class', 'map-layer')
        .on('click', function (d, i) {
            if (that.selectedCountry !== undefined) {
                that.selectedCountry
                    .style('stroke', undefined)
                    .style('stroke-width', that.STROKE_WIDTH);
            }
            if (that.seaClickHandler)
                that.seaClickHandler.call(this, d, i);
        });
    // Add SVG elements
    // this.graticule = this.svg.append('g').append('path')
    //     .attr('class', 'graticule');
    this.land = this.svg.append('g')
        .attr('class', 'land');
    // Add other layers
    this.arrowsLayer = this.root.append('div')
        .attr('class', 'arrows-layer map-layer')
        .style('transform-origin', '0px 0px');
    this.windLayer = this.root.append('canvas')
        .attr('class', 'wind map-layer')
        .style('transform-origin', '0px 0px');
    this.sunLayer = this.root.append('canvas')
        .attr('class', 'solar map-layer')
        .style('transform-origin', '0px 0px');

    this.zoom = d3.zoom().on('zoom', function() {
        var transform = d3.event.transform;
        // Scale the svg g elements in order to keep control over stroke width
        // See https://github.com/tmrowco/electricitymap/issues/471
        that.land.attr('transform', transform);
        // that.graticule.attr('transform', transform);

        // Apply CSS transforms
        [that.arrowsLayer, that.windLayer, that.sunLayer].forEach(function (e) {
            e.style('transform',
                'translate(' + transform.x + 'px,' + transform.y + 'px) scale(' + transform.k + ')'
            );
        });
        // If we don't want to scale the layer in order to keep the arrow size constant,
        // we will need to translate every arrow element by it's original dX multiplied by transform.k
    })
    .on('start', function() {
        d3.select(this).style('cursor', 'move');
    })
    .on('end', function() {
        d3.select(this).style('cursor', undefined);
    });

    d3.select(this.root.node().parentNode).call(this.zoom);
}

CountryMap.prototype.render = function() {
    // Determine scale (i.e. zoom) based on the size
    this.containerWidth = this.root.node().parentNode.getBoundingClientRect().width;
    this.containerHeight = this.root.node().parentNode.getBoundingClientRect().height;

    // Nothing to render
    if (!this.containerHeight || !this.containerWidth)
        return this;

    var scale = this.containerHeight * 1.5;
    // Determine map width and height based on bounding box of Europe
    var sw = [-15, 34.7];
    var ne = [34, 72];
    var center = [0, 50]; // Center of the map projection
    this._projection = d3.geoTransverseMercator()
        .rotate([-center[0], -center[1]])
        .scale(scale)
        .translate([0, 0]); // Warning, default translation is [480, 250]
    var projected_sw = this._projection(sw);
    var projected_ne = this._projection(ne);
    // This is a curved representation, so take all 4 corners in order to make
    // sure we include them all
    var se = [ne[0], sw[1]];
    var nw = [sw[0], ne[1]];
    var projected_se = this._projection(se);
    var projected_nw = this._projection(nw);
    this.mapWidth = Math.max(projected_ne[0], projected_se[0]) -
        Math.min(projected_sw[0], projected_nw[0]); // TODO: Never do width < 100% !
    this.mapHeight = Math.max(projected_sw[1], projected_se[1]) -
        Math.min(projected_ne[1], projected_nw[1]);
    // Width and height should nevertheless never be smaller than the container
    this.mapWidth  = Math.max(this.mapWidth,  this.containerWidth);
    this.mapHeight = Math.max(this.mapHeight, this.containerHeight);

    this.root
        .style('height', this.mapHeight + 'px')
        .style('width', this.mapWidth + 'px');
    this.svg
        .style('height', this.mapHeight + 'px')
        .style('width', this.mapWidth + 'px');

    // Set proper translation now that we have all information needed
    // Right now we set the upper left point to be at (0, 0)
    var upperleft = [
        Math.min(projected_sw[0], projected_nw[0]),
        Math.min(projected_nw[1], projected_ne[1])
    ];
    this._projection
        .translate([-upperleft[0], -upperleft[1]]);

    this.zoom
        .scaleExtent([1, 5])
        .translateExtent([[0, 0], [this.mapWidth, this.mapHeight]]);

    this.path = d3.geoPath()
        .projection(this._projection);
        
    // var graticuleData = d3.geoGraticule()
    //     .step([5, 5]);
        
    // this.graticule
    //     .datum(graticuleData)
    //     .attr('d', this.path);

    var that = this;
    if (this._data) {
        var getCo2Color = function (d) {
            return (d.co2intensity !== undefined) ? that.co2color()(d.co2intensity) : 'lightgray';
        };
        var selector = this.land.selectAll('.country')
            .data(this._data, function(d) { return d.countryCode; });
        selector.enter()
            .append('path')
                .attr('class', 'country')
                .attr('stroke-width', that.STROKE_WIDTH)
                .attr('fill', getCo2Color)
                .on('mouseover', function (d, i) {
                    if (that.countryMouseOverHandler)
                        return that.countryMouseOverHandler.call(this, d, i);
                })
                .on('mouseout', function (d, i) {
                    if (that.countryMouseOutHandler)
                        return that.countryMouseOutHandler.call(this, d, i);
                })
                .on('mousemove', function (d, i) {
                    if (that.countryMouseMoveHandler)
                        return that.countryMouseMoveHandler.call(this, d, i);
                })
                .on('click', function (d, i) {
                    d3.event.stopPropagation(); // To avoid call click on sea
                    if (that.selectedCountry !== undefined) {
                        that.selectedCountry
                            .style('stroke', that.STROKE_COLOR)
                            .style('stroke-width', that.STROKE_WIDTH);
                    }
                    that.selectedCountry = d3.select(this);
                    // that.selectedCountry
                    //     .style('stroke', 'darkred')
                    //     .style('stroke-width', 1.5);
                    return that.countryClickHandler.call(this, d, i);
                })
            .merge(selector)
                .attr('d', this.path)
                .transition()
                .duration(2000)
                .attr('fill', getCo2Color);
    }

    return this;
}

CountryMap.prototype.co2color = function(arg) {
    if (!arg) return this._co2color;
    else this._co2color = arg;
    return this;
};

CountryMap.prototype.exchangeLayer = function(arg) {
    if (!arg) return this._exchangeLayer;
    else this._exchangeLayer = arg;
    return this;
};

CountryMap.prototype.projection = function(arg) {
    if (!arg) return this._projection;
    else this._projection = arg;
    return this;
};

CountryMap.prototype.onSeaClick = function(arg) {
    if (!arg) return this.seaClickHandler;
    else this.seaClickHandler = arg;
    return this;
};

CountryMap.prototype.onCountryClick = function(arg) {
    if (!arg) return this.countryClickHandler;
    else this.countryClickHandler = arg;
    return this;
};

CountryMap.prototype.onCountryMouseOver = function(arg) {
    if (!arg) return this.countryMouseOverHandler;
    else this.countryMouseOverHandler = arg;
    return this;
};

CountryMap.prototype.onCountryMouseMove = function(arg) {
    if (!arg) return this.countryMouseMoveHandler;
    else this.countryMouseMoveHandler = arg;
    return this;
};

CountryMap.prototype.onCountryMouseOut = function(arg) {
    if (!arg) return this.countryMouseOutHandler;
    else this.countryMouseOutHandler = arg;
    return this;
};

CountryMap.prototype.data = function(data) {
    if (!data) {
        return this._data;
    } else {
        this._data = data;
    }
    return this;
};

CountryMap.prototype.center = function(center) {
    if (!center) {
        return this._center;
    } else if (this._center) {
        // Only allow setting the center once in order to avoid
        // quirky UX due to sporadic re-centering
        console.warn('Center has already been set.');
        return this;
    } else if (!this._projection) {
        console.warn('Can\'t change center when projection is not already set.');
        return this;
    } else {
        var p = this._projection(center);
        this.zoom
            .translateBy(d3.select(this.root.node().parentNode), // WARNING, this is accumulative.
              -1 * p[0] + 0.5 * this.containerWidth,
              -1 * p[1] + 0.5 * this.containerHeight
            );
        this._center = center;
    }
    return this;
}

module.exports = CountryMap;
