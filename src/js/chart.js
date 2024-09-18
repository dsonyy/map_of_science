import * as d3 from "d3";
import * as zoom from "./zoom";
import * as foreground from "./foreground";
import * as article from "./article";

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
          .on("zoom", (event) => zoom.handleZoom(event, data))
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
      .on("mouseover", (event) => {})
      .on("click", (event) => {
        article.enableArticle(d);
      });

    if (d.numRecentArticles <= 50) {
      group
        .append("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y))
        .attr("r", 3)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles <= 200) {
      group
        .append("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y))
        .attr("r", 4)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles <= 500) {
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
    } else if (d.numRecentArticles <= 1000) {
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
    } else if (d.numRecentArticles > 1000) {
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
    }
  });

  // UPDATE phase for existing data points
  shapes.each(function (d) {
    const group = d3.select(this);

    if (d.numRecentArticles <= 50) {
      group
        .selectAll("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y));
    } else if (d.numRecentArticles <= 200) {
      group
        .selectAll("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y));
    } else if (d.numRecentArticles <= 500) {
      // two circles
      group
        .selectAll("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y));
      //   group.select("circle").attr("cx", xScale(d.x)).attr("cy", yScale(d.y));
    } else if (d.numRecentArticles <= 1000) {
      group
        .selectAll("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y));
    } else if (d.numRecentArticles > 1000) {
      group
        .selectAll("circle")
        .attr("cx", zoom.xScale(d.x))
        .attr("cy", zoom.yScale(d.y));
    }
  });

  // EXIT phase for removed data points
  shapes.exit().remove();
}
