// import { seriesSvgAnnotation } from "./annotation-series.js";
import * as d3 from "d3";
import * as fc from "d3fc";
import {
  distance,
  trunc,
  hashCode,
  webglColor,
  iterateElements,
} from "./util.js";

let data = [];
let quadtree;

// const createAnnotationData = (datapoint) => ({
//   note: {
//     label: "dupa",
//     bgPadding: 5,
//     title: "dupa2",
//   },
//   x: datapoint.x,
//   y: datapoint.y,
//   dx: 20,
//   dy: 20,
// });

// create a web worker that streams the chart data
const streamingLoaderWorker = new Worker(
  new URL("./streaming-tsv-parser.js", import.meta.url).href
);

function getClusterCategoryList() {
  return [
    "biology",
    "chemistry",
    "computer science",
    "earth science",
    "engineering",
    "humanities",
    "materials science",
    "mathematics",
    "medicine",
    "physics",
    "social science",
  ];
}

function clusterCategoryIdToText(clusterCategoryId) {
  return getClusterCategoryList()[clusterCategoryId];
}

function clusterCategoryPalette() {
  const alpha = 0.75;
  return [
    [0.875, 0.125, 0.125, alpha],
    [0.875, 0.5341, 0.125, alpha],
    [0.8068, 0.875, 0.125, alpha],
    [0.3977, 0.875, 0.125, alpha],
    [0.125, 0.875, 0.2614, alpha],
    [0.125, 0.875, 0.6705, alpha],
    [0.125, 0.6705, 0.875, alpha],
    [0.125, 0.2614, 0.875, alpha],
    [0.3977, 0.125, 0.875, alpha],
    [0.8068, 0.125, 0.875, alpha],
    [0.875, 0.125, 0.5341, alpha],
  ];
}

function clusterCategoryIdToColor(clusterCategoryId) {
  return clusterCategoryPalette()[clusterCategoryId];
}

streamingLoaderWorker.onmessage = ({
  data: { items, totalBytes, finished },
}) => {
  const rows = items.map((d) => ({
    //   ...d,
    x: Number(d["x"]),
    y: Number(d["y"]),
    numRecentArticles: Number(d["num_recent_articles"]),
    growthRating: Number(d["growth_rating"]),
    clusterCategoryId: Number(d["cluster_category"]),
    //   year: Number(d.date),
  }));
  // .filter((d) => d.year);
  data = data.concat(rows);

  if (finished) {
    document.getElementById("loading").style.display = "none";

    // compute the fill color for each datapoint
    // const languageFill = (d) =>
    //   webglColor(languageColorScale(hashCode(d.language) % 10));
    // const yearFill = (d) => webglColor(yearColorScale(d.year));

    // const fillColor = fc.webglFillColor().value(languageFill).data(data);
    // pointSeries.decorate((program) => fillColor(program));

    // wire up the fill color selector
    iterateElements(".controls a", (el) => {
      el.addEventListener("click", () => {
        iterateElements(".controls a", (el2) => el2.classList.remove("active"));
        el.classList.add("active");
        // fillColor.value(el.id === "language" ? languageFill : yearFill);
        // redraw();
      });
    });

    // create a spatial index for rapidly finding the closest datapoint
    quadtree = d3
      .quadtree()
      .x((d) => d.x)
      .y((d) => d.y)
      .addAll(data);
  }

  redraw();
};

streamingLoaderWorker.postMessage(
  new URL("./processed1_data.tsv", import.meta.url).href
);

// const languageColorScale = d3.scaleOrdinal(d3.schemeCategory10);
// const yearColorScale = d3
//   .scaleSequential()
//   .domain([1850, 2000])
//   .interpolator(d3.interpolateRdYlGn);
const xScale = d3.scaleLinear().domain([-500, 500]);
const yScale = d3.scaleLinear().domain([-500, 500]);
const xScaleOriginal = xScale.copy();
const yScaleOriginal = yScale.copy();

function buildZoom() {
  return d3
    .zoom()
    .scaleExtent([0.8, 1000])
    .on("zoom", (event) => {
      // update the scales based on current zoom
      xScale.domain(event.transform.rescaleX(xScaleOriginal).domain());
      yScale.domain(event.transform.rescaleY(yScaleOriginal).domain());

      const k = event.transform.k;

      const pointSeries0 = buildFcPointSeries(k);

      chart = buildChart(
        xScale,
        yScale,
        xScaleOriginal,
        yScaleOriginal,
        pointSeries0,
        zoom,
        pointer
      );

      redraw();
    });
}

const zoom = buildZoom();

const annotations = [];

function buildFcPointer() {
  return fc.pointer().on("point", ([coord]) => {
    annotations.pop();
    if (!coord || !quadtree) {
      return;
    }
    // find the closes datapoint to the pointer
    const x = xScale.invert(coord.x);
    const y = yScale.invert(coord.y);
    const radius = 0.5;
    const closestDatum = quadtree.find(x, y, radius);
    // if (closestDatum) {
    //   annotations[0] = createAnnotationData(closestDatum);
    // }
    redraw();
  });
}

const pointer = buildFcPointer();

// const annotationSeries = seriesSvgAnnotation()
//   .notePadding(15)
//   .type(d3.annotationCallout);

function pointDecorateProgram(data, program) {
  fc
    .webglFillColor()
    .value((dataPoint) => clusterCategoryIdToColor(dataPoint.clusterCategoryId))
    .data(data)(program);

  fc
    .webglStrokeColor()
    .value((_) => [0.1, 0, 0.4, 0.7])
    .data(data)(program);
}

function pointDecorateShaderProgram(data, program) {
  program
    .fragmentShader()
    .appendHeader(
      "precision mediump float; uniform vec4 fill; uniform vec4 stroke;"
    ).appendBody(`
      vec2 d = gl_PointCoord.xy - 0.5;
      vec4 col = vec4(0.0, 0.0, 0.0, 0.6 - 0.6 * smoothstep(0.4, 0.5, length(d)));
      gl_FragColor = col;
  `);
}

function shaderProgramSetBlend(program) {
  const gl = program.context();
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA
  );
}

function pointDataToSize(pointData, k = 1.0) {
  k = Math.max(0.5, Math.min(k, 3.0));
  return Math.max(
    100,
    Math.min(1000 * k * (pointData.numRecentArticles / 1000), 10000)
  );
}

function buildFcPointSeries(k = 1.0) {
  return fc
    .seriesWebglPoint()
    .equals((a, b) => a === b)
    .size((pointData) => pointDataToSize(pointData, k))
    .crossValue((pointData) => pointData.x)
    .mainValue((pointData) => pointData.y)
    .decorate((program) => {
      pointDecorateProgram(data, program);
      // pointDecorateShaderProgram(data, program);
      shaderProgramSetBlend(program);
    });
}

let pointSeries = buildFcPointSeries();

function buildChart(
  xScale,
  yScale,
  xScaleOriginal,
  yScaleOriginal,
  pointSeries,
  zoom,
  pointer
) {
  const axis = fc.axisBottom(xScale).decorate((s) => {
    console.log(s.enter().style("dupa", "2137"));
    // s.enter().style();
    // .select("path")
    // .style("fill", (d) => (d >= 100 ? "red" : "black"));
  });

  return (
    fc
      // .chart()
      .chartCartesian(xScale, yScale)
      // .axisBottom(d3.axisBottom(xScale))
      .webglPlotArea(
        // only render the point series on the WebGL layer
        fc
          .seriesWebglMulti()
          .series([pointSeries])
          .mapping((d) => d.data)
      )
      .svgPlotArea(
        // only render the annotations series on the SVG layer
        fc.seriesSvgMulti()
        //   .series([pointSeriesOverlay])
        //   .mapping((d) => d.data)
        //       .series([annotationSeries])
        //       .mapping((d) => d.annotations)
      )
      .decorate((sel) =>
        sel
          .enter()
          .select("d3fc-svg.plot-area")
          .on("measure.range", (event) => {
            xScaleOriginal.range([0, event.detail.width]);
            yScaleOriginal.range([event.detail.height, 0]);
            axisHide();
          })
          .call(zoom)
          .call(pointer)
      )
  );
}

function axisHide() {
  /**
   * Hides d3fc axis. Probably the easiest way to acheve that.
   * An alternative is to use pure CSS and add !important tag.
   */
  d3.select("#chart")
    .select("d3fc-svg.x-axis")
    .style("height", "0")
    .style("width", "0");
  d3.select("#chart")
    .select("d3fc-svg.y-axis")
    .style("height", "0")
    .style("width", "0");
}

let chart = buildChart(
  xScale,
  yScale,
  xScaleOriginal,
  yScaleOriginal,
  pointSeries,
  zoom,
  pointer
);

// render the chart with the required data
// Enqueues a redraw to occur on the next animation frame
function redraw() {
  d3.select("#chart").datum({ annotations, data }).call(chart);
}
