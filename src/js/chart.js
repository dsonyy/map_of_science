import * as d3 from "d3";
import * as zoom from "./zoom";
import * as foreground from "./foreground";
import * as article from "./article";
import * as annotation from "./annotation";
import {
  CITY_5_OUTER_SIZE,
  CITY_5_INNER_SIZE,
  CITY_SIZE_THRESHOLD_0,
  CITY_SIZE_THRESHOLD_1,
  CITY_SIZE_THRESHOLD_2,
  CITY_SIZE_THRESHOLD_3,
  CITY_SIZE_THRESHOLD_4,
  CITY_SIZE_THRESHOLD_5,
} from "./config";

let plotGroup = null;

function enableChartScreen() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("chart").style.display = "block";
}

function buildChart(data) {
  return (
    d3
      .select("#chart-d3")
      .append("svg")
      .attr("width", document.getElementById("chart-d3").clientWidth)
      .attr("height", document.getElementById("chart-d3").clientHeight)
      .call(
        d3
          .zoom()
          .scaleExtent([zoom.zoomMin, zoom.zoomMax])
          .on("zoom", (event) => zoom.handleZoom(event, data)),
      )
      /**
       * Below line fixes error with:
       * (0 , d3_selection__WEBPACK_IMPORTED_MODULE_7__.default)(...).transition is not a function
       * TypeError: (0 , d3_selection__WEBPACK_IMPORTED_MODULE_7__.default)(...).transition is not a function
       */
      .on("dblclick.zoom", null)
      .append("g")
  );
}

export function initChart(dataPoints) {
  enableChartScreen();

  const width = document.getElementById("chart-d3").clientWidth;
  const height = document.getElementById("chart-d3").clientHeight;
  zoom.updateGlobalScaleDomains(width, height);
  zoom.transformLocalScaleDomains(d3.zoomIdentity);
  zoom.updateScaleRanges(width, height);

  // foreground init
  foreground.initForeground(zoom.xScale, zoom.yScale, d3.zoomIdentity.k);

  const svg = buildChart(dataPoints);
  // Create a group for all plot elements
  plotGroup = svg.append("g");

  zoom.handleResize(dataPoints);

  window.addEventListener("resize", () => zoom.handleResize(dataPoints));
}

// eslint-disable-next-line no-unused-vars
function handleCityHover(event, city) {
  annotation.updateAnnotation(city);
}

// eslint-disable-next-line no-unused-vars
function handleCityClick(event, city) {
  article.enableArticle(city);
}

// eslint-disable-next-line no-unused-vars
function handleCityHoverOut(event, city) {
  annotation.updateAnnotation(null);
}

export function renderChart(data) {
  const shapes = plotGroup
    .selectAll(".city-shape")
    .data(data, (d) => d.clusterId);

  // ENTER phase for new data points
  const newShapes = shapes.enter().append("g").attr("class", "city-shape");

  // Append shapes depending on the city type
  newShapes.each(function (d) {
    const group = d3
      .select(this)
      .on("mouseover", (event) => handleCityHover(event, d))
      .on("click", (event) => handleCityClick(event, d))
      .on("mouseout", (event) => handleCityHoverOut(event));

    if (d.numRecentArticles <= CITY_SIZE_THRESHOLD_0) {
      group
        .append("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y))
        .attr("r", 3)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles <= CITY_SIZE_THRESHOLD_1) {
      group
        .append("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y))
        .attr("r", 4)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles <= CITY_SIZE_THRESHOLD_2) {
      group
        .append("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y))
        .attr("r", 5)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);

      group
        .append("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y))
        .attr("r", 2)
        .style("fill", "black")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles <= CITY_SIZE_THRESHOLD_3) {
      group
        .append("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y))
        .attr("r", 6)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);

      group
        .append("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y))
        .attr("r", 3)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles <= CITY_SIZE_THRESHOLD_4) {
      group
        .append("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y))
        .attr("r", 7)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);

      group
        .append("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y))
        .attr("r", 4)
        .style("fill", "black")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles <= CITY_SIZE_THRESHOLD_5) {
      group
        .append("rect")
        .attr("class", "city5-outer")
        .attr("x", zoom.xScale(d.x) - CITY_5_OUTER_SIZE / 2)
        .attr("y", zoom.yScale(d.y) - CITY_5_OUTER_SIZE / 2)
        .attr("width", CITY_5_OUTER_SIZE)
        .attr("height", CITY_5_OUTER_SIZE)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);

      group
        .append("rect")
        .attr("class", "city5-inner")
        .attr("x", zoom.xScale(d.x) - CITY_5_INNER_SIZE / 2)
        .attr("y", zoom.yScale(d.y) - CITY_5_INNER_SIZE / 2)
        .attr("width", CITY_5_INNER_SIZE)
        .attr("height", CITY_5_INNER_SIZE)
        .style("fill", "black");
    }
  });

  // UPDATE phase for existing data points
  shapes.each(function (d) {
    const group = d3.select(this);
    group
      .selectAll("circle")
      .attr("cx", zoom.xScale(d.x))
      .attr("cy", zoom.yScale(d.y));
    group
      .selectAll(".city5-outer")
      .attr("x", zoom.xScale(d.x) - CITY_5_OUTER_SIZE / 2)
      .attr("y", zoom.yScale(d.y) - CITY_5_OUTER_SIZE / 2);
    group
      .selectAll(".city5-inner")
      .attr("x", zoom.xScale(d.x) - CITY_5_INNER_SIZE / 2)
      .attr("y", zoom.yScale(d.y) - CITY_5_INNER_SIZE / 2);
  });

  // EXIT phase for removed data points
  shapes.exit().remove();
}
