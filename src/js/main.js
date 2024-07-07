// import { seriesSvgAnnotation } from "./annotation-series.js";
import * as d3 from "d3";
import * as fc from "d3fc";
import * as fca from "@d3fc/d3fc-annotation";
import * as d3SvgAnnotation from "d3-svg-annotation";

import {
  distance,
  trunc,
  hashCode,
  webglColor,
  iterateElements,
} from "./util.js";

let data = [];
let quadtree;

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

function keyConceptsIdsParse(keyConceptsRaw) {
  keyConceptsRaw.split(",");
}

streamingLoaderWorker.onmessage = ({
  data: { items, totalBytes, finished },
}) => {
  const rows = items.map((d) => ({
    clusterId: Number(d["cluster_id"]),
    x: Number(d["x"]),
    y: Number(d["y"]),
    numRecentArticles: Number(d["num_recent_articles"]),
    growthRating: Number(d["growth_rating"]),
    clusterCategoryId: Number(d["cluster_category"]),
    keyConcepts: keyConceptsIdsParse(d["key_concepts"]),
  }));
  data = data.concat(rows);

  if (finished) {
    document.getElementById("loading").style.display = "none";
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

const xScale = d3.scaleLinear().domain([-500, 500]);
const yScale = d3.scaleLinear().domain([-500, 500]);
const xScaleOriginal = xScale.copy();
const yScaleOriginal = yScale.copy();

function buildAnnotationData(pointData) {
  return {
    note: {
      label: clusterCategoryIdToText(pointData.clusterCategoryId),
      bgPadding: 10,
      title: "#" + pointData.clusterId,
    },
    x: pointData.x,
    y: pointData.y,
    dx: 20,
    dy: 20,
  };
}

function buildZoom() {
  return d3
    .zoom()
    .scaleExtent([0.8, 1000])
    .on("zoom", (event) => {
      // update the scales based on current zoom
      xScale.domain(event.transform.rescaleX(xScaleOriginal).domain());
      yScale.domain(event.transform.rescaleY(yScaleOriginal).domain());

      // const k = event.transform.k;

      // const pointSeries0 = buildFcPointSeries(k);

      // chart = buildChart(
      //   xScale,
      //   yScale,
      //   xScaleOriginal,
      //   yScaleOriginal,
      //   pointSeries0,
      //   zoom,
      //   pointer
      // );

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
    const x = xScale.invert(coord.x) - 5;
    const y = yScale.invert(coord.y);
    const radius = Math.abs(
      xScale.invert(coord.x) - xScale.invert(coord.x + 20)
    );

    const closestDatum = quadtree.find(x, y, radius);

    if (closestDatum) {
      annotations[0] = buildAnnotationData(closestDatum);
    }

    redraw();
  });
}
const pointer = buildFcPointer();

const annotationSeries = buildAnnotationSeries()
  .notePadding(15)
  .type(d3SvgAnnotation.annotationCallout);

function pointDecorateProgram(data, program) {
  fc
    .webglFillColor()
    .value((dataPoint) => clusterCategoryIdToColor(dataPoint.clusterCategoryId))
    .data(data)(program);

  fc
    .webglStrokeColor()
    .value((_) => [0.0, 0.0, 0.0, 0.5])
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

function buildAnnotationSeries() {
  const d3Annotation = d3SvgAnnotation.annotation();

  let xScale = d3.scaleLinear();
  let yScale = d3.scaleLinear();

  const join = fc.dataJoin("g", "annotation");

  const series = (selection) => {
    selection.each((data, index, group) => {
      const projectedData = data.map((d) => ({
        ...d,
        x: xScale(d.x),
        y: yScale(d.y),
      }));

      d3Annotation.annotations(projectedData);

      join(d3.select(group[index]), projectedData).call(d3Annotation);
    });
  };

  series.xScale = (...args) => {
    if (!args.length) {
      return xScale;
    }
    xScale = args[0];
    return series;
  };

  series.yScale = (...args) => {
    if (!args.length) {
      return yScale;
    }
    yScale = args[0];
    return series;
  };

  fc.rebindAll(series, d3Annotation);

  return series;
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
  return fc
    .chartCartesian(xScale, yScale)
    .webglPlotArea(
      // only render the point series on the WebGL layer
      fc
        .seriesWebglMulti()
        .series([pointSeries])
        .mapping((d) => d.data)
    )
    .svgPlotArea(
      // only render the annotations series on the SVG layer
      fc
        .seriesSvgMulti()
        .series([annotationSeries])
        .mapping((d) => d.annotations)
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
