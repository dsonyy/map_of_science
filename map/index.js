import { seriesSvgAnnotation } from "./annotation-series.js";
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
const streamingLoaderWorker = new Worker("streaming-tsv-parser.js");
streamingLoaderWorker.onmessage = ({
  data: { items, totalBytes, finished },
}) => {
  const rows = items.map((d) => ({
    //   ...d,
    x: Number(d.x),
    y: Number(d.y),
    articles_no: Number(d.num_recent_articles),
    growth_rate: Number(d.growth_rating),
    //   year: Number(d.date),
  }));
  // .filter((d) => d.year);
  data = data.concat(rows);

  if (finished) {
    console.log(data);

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

  console.log(data.length);
  redraw();
};

streamingLoaderWorker.postMessage("processed1_data.tsv");

// const languageColorScale = d3.scaleOrdinal(d3.schemeCategory10);
// const yearColorScale = d3
//   .scaleSequential()
//   .domain([1850, 2000])
//   .interpolator(d3.interpolateRdYlGn);
const xScale = d3.scaleLinear().domain([-500, 500]);
const yScale = d3.scaleLinear().domain([-500, 500]);
const xScaleOriginal = xScale.copy();
const yScaleOriginal = yScale.copy();

const zoom = d3
  .zoom()
  .scaleExtent([0.8, 1000])
  .on("zoom", (event) => {
    // update the scales based on current zoom
    xScale.domain(event.transform.rescaleX(xScaleOriginal).domain());
    yScale.domain(event.transform.rescaleY(yScaleOriginal).domain());

    if (event.transform.k > 4) {
      console.log("dupa");
      const pointSeries0 = fc
        .seriesWebglPoint()
        .equals((prevData, data) => prevData === data)
        .size((d) => Math.max(d.articles_no * 5, 1))
        .crossValue((d) => d.x)
        .mainValue((d) => d.y)
        .decorate((program) => {
          fc
            .webglFillColor()
            .value((d) => [0.1, 0.9, 0.4, 0.5])
            .data(data)(program);

          fc
            .webglStrokeColor()
            .value((d) => [0.1, 0, 0.4, 0.7])
            .data(data)(program);

          // program
          //   .fragmentShader()
          //   .appendHeader(
          //     "precision mediump float; uniform vec4 fill; uniform vec4 stroke;"
          //   ).appendBody(`
          //     vec2 d = gl_PointCoord.xy - 0.5;
          //     vec4 col = vec4(0.0, 0.0, 0.0, 0.6 - 0.6 * smoothstep(0.4, 0.5, length(d)));
          //     gl_FragColor = col;
          // `);

          const gl = program.context();
          gl.enable(gl.BLEND);
          gl.blendFuncSeparate(
            gl.SRC_ALPHA,
            gl.ONE_MINUS_DST_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA
          );
        });

      chart = fc
        .chartCartesian(xScale, yScale)
        .webglPlotArea(
          // only render the point series on the WebGL layer
          fc
            .seriesWebglMulti()
            .series([pointSeries0])
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
            })
            .call(zoom)
            .call(pointer)
        );
    }

    redraw();
  });

const annotations = [];

const pointer = fc.pointer().on("point", ([coord]) => {
  annotations.pop();
  if (!coord || !quadtree) {
    return;
  }
  // find the closes datapoint to the pointer
  // const x = xScale.invert(coord.x);
  // const y = yScale.invert(coord.y);
  // const radius = 0.5;
  // const closestDatum = quadtree.find(x, y, radius);
  //   if (closestDatum) {
  //     annotations[0] = createAnnotationData(closestDatum);
  //   }
  redraw();
});

const annotationSeries = seriesSvgAnnotation()
  .notePadding(15)
  .type(d3.annotationCallout);

let pointSeries = fc
  .seriesWebglPoint()
  .equals((prevData, data) => prevData === data)
  .size((d) => Math.max(d.articles_no / 10, 1))
  .crossValue((d) => d.x)
  .mainValue((d) => d.y)
  .decorate((program) => {
    fc
      .webglFillColor()
      .value((d) => [0.1, 0, 0.4, 0.5])
      .data(data)(program);

    fc
      .webglStrokeColor()
      .value((d) => [0.1, 0, 0.4, 0.7])
      .data(data)(program);

    // program
    //   .fragmentShader()
    //   .appendHeader(
    //     "precision mediump float; uniform vec4 fill; uniform vec4 stroke;"
    //   ).appendBody(`
    //     vec2 d = gl_PointCoord.xy - 0.5;
    //     vec4 col = vec4(0.0, 0.0, 0.0, 0.6 - 0.6 * smoothstep(0.4, 0.5, length(d)));
    //     gl_FragColor = col;
    // `);

    const gl = program.context();
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_DST_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );
  });

let chart = fc
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
      })
      .call(zoom)
      .call(pointer)
  );

// render the chart with the required data
// Enqueues a redraw to occur on the next animation frame
const redraw = () => {
  d3.select("#chart").datum({ annotations, data }).call(chart);
};

class Chart {
  constructor() {}

  redraw() {}
}
