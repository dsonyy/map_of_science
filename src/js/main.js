import * as d3 from "d3";
import * as foreground from "./foreground";
import * as params from "./params";

let data = [];
let concepts = {};
let quadtree = null;
let plotGroup = null;
const xScaleOriginal = d3.scaleLinear();
const yScaleOriginal = d3.scaleLinear();
let xScale = xScaleOriginal.copy();
let yScale = yScaleOriginal.copy();

let zoomTransform = d3.zoomIdentity;

function parseKeyConceptsRaw(keyConceptsRaw) {
  return keyConceptsRaw.split(",");
}

function parseConceptItem(item) {
  concepts[item["index"]] = item["key"];
}

function handleConceptsLoaded(conceptData) {
  console.log("Concepts Loaded");
  //   concepts = conceptData;
}

function parseDataPointItem(item) {
  return {
    clusterId: Number(item["cluster_id"]),
    x: Number(item["x"]),
    y: Number(item["y"]),
    numRecentArticles: Number(item["num_recent_articles"]),
    growthRating: Number(item["growth_rating"]),
    clusterCategoryId: Number(item["cluster_category"]),
    keyConcepts: parseKeyConceptsRaw(item["key_concepts"]),
  };
}

function findClosestDataPoint(dataPoints, x, y, radius) {
  dataPoints.sort((a, b) => {
    const distA = Math.pow(a.x - x, 2) + Math.pow(a.y - y, 2);
    const distB = Math.pow(b.x - x, 2) + Math.pow(b.y - y, 2);
    return distA - distB;
  });
  const closestDataPoint = dataPoints[0];
  const dist =
    Math.pow(closestDataPoint.x - x, 2) + Math.pow(closestDataPoint.y - y, 2);

  if (dist > radius * radius) {
    return null;
  }
  return closestDataPoint;
}

function handleMouseClick(dataPoints, x, y, xScale, yScale) {
  const closestDataPoint = findClosestDataPoint(dataPoints, x, y, 25);

  if (!closestDataPoint) {
    disableArticle();
  } else {
    enableArticle(closestDataPoint);
  }
}

function handleDataPointsLoaded(dataPoints) {
  console.log("Data Points Loaded");

  // Sort data by num_recent_articles
  dataPoints.sort((a, b) => b.numRecentArticles - a.numRecentArticles);

  // Create a spatial index for rapidly finding the closest data point
  quadtree = buildQuadtree(dataPoints);

  initChart(dataPoints);
}

function buildQuadtree(dataPoints) {
  const quadtree = d3
    .quadtree()
    .x((d) => d.x)
    .y((d) => d.y)
    .addAll(dataPoints);
  return quadtree;
}

function buildLoaderWorker() {
  return new Worker(new URL("./streaming-tsv-parser.js", import.meta.url).href);
}

function handleLoaderWorkerMessage(
  { data: { items, totalBytes, finished } },
  parseItem,
  dataTarget,
  onLoaded
) {
  const rows = items.map(parseItem);

  dataTarget.push(...rows);

  if (finished) {
    onLoaded(dataTarget);
  }
}

function runLoaderWorker(loaderWorker, url) {
  loaderWorker.postMessage(url.href);
}

function loadData(url, parseItem, dataTarget, onLoaded) {
  const loaderWorker = buildLoaderWorker();
  loaderWorker.onmessage = (d) =>
    handleLoaderWorkerMessage(d, parseItem, dataTarget, onLoaded);
  runLoaderWorker(loaderWorker, url);
}

function loadDataPoints() {
  loadData(
    new URL("./processed1_data.tsv", import.meta.url),
    parseDataPointItem,
    data, // Separate array for data points
    handleDataPointsLoaded
  );
}

function loadConcepts() {
  loadData(
    new URL("./processed0_keys.tsv", import.meta.url),
    parseConceptItem,
    [], // We don't need to store the concepts in an array, they go to the `concepts` object
    handleConceptsLoaded
  );
}

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

function enableLoadingScreen() {
  document.getElementById("loading").style.display = "block";
  document.getElementById("chart").style.display = "none";
}

function enableChartScreen() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("chart").style.display = "block";
}

function initChart(dataPoints) {
  enableChartScreen();

  const width = document.getElementById("chart-d3").clientWidth;
  const height = document.getElementById("chart-d3").clientHeight;
  updateGlobalScaleDomains(width, height);
  transformLocalScaleDomains(d3.zoomIdentity);
  updateScaleRanges(width, height);

  // foreground init
  foreground.initForeground(xScale, yScale);

  const svg = buildChart();
  // Create a group for all plot elements
  plotGroup = svg.append("g");

  const _data = getDataPointsToRender(data, xScale, yScale);
  renderChart(_data);

  window.addEventListener("resize", handleResize);
}

function updateMouseMoveHandler(dataPoints, xScale, yScale) {
  d3.select("#chart-d3").on("mousemove", (eventMouse) =>
    handleMouseMove(eventMouse, dataPoints, xScale, yScale)
  );
}

function handleMouseMove(eventPointer, dataPoints, xScale, yScale) {
  const x = xScale.invert(eventPointer.offsetX);
  const y = yScale.invert(eventPointer.offsetY);

  dataPoints.sort((a, b) => {
    const distA = Math.pow(a.x - x, 2) + Math.pow(a.y - y, 2);
    const distB = Math.pow(b.x - x, 2) + Math.pow(b.y - y, 2);
    return distA - distB;
  });
  const closestDataPoint = dataPoints[0];

  updateAnnotation(closestDataPoint, xScale, yScale);
}

function updateGlobalScaleDomains(chartWidth, chartHeight) {
  // rescale the global domain to keep chart aspect ratio
  xScaleOriginal.domain([-chartWidth / 2, chartWidth / 2]);
  yScaleOriginal.domain([-chartHeight / 2, chartHeight / 2]);
}

function transformLocalScaleDomains(transform) {
  // rescale to present the area which should be visible after zoom
  const xRange = transform.rescaleX(xScaleOriginal).domain();
  const yRange = transform.rescaleY(yScaleOriginal).domain();

  xScale.domain(xRange);
  yScale.domain(yRange);
}

function updateScaleRanges(chartWidth, chartHeight) {
  const xRange = [0, chartWidth];
  const yRange = [chartHeight, 0];
  xScaleOriginal.range(xRange);
  yScaleOriginal.range(yRange);
  xScale.range(xRange);
  yScale.range(yRange);
}

function isDataPointInDomain(dataPoint, xScale, yScale) {
  const x = dataPoint.x;
  const y = dataPoint.y;

  const xDomain = xScale.domain();
  const yDomain = yScale.domain();

  if (x < xDomain[0] || x > xDomain[1] || y < yDomain[0] || y > yDomain[1]) {
    return false;
  }

  return true;
}

function getDataPointsToRender(dataPointsSorted, xScale, yScale) {
  const dataInDomain = dataPointsSorted.filter((d) =>
    isDataPointInDomain(d, xScale, yScale)
  );
  const dataToRender = dataInDomain.slice(0, 300);
  return dataToRender;
}

function buildChart() {
  return (
    d3
      .select("#chart-d3")
      .append("svg")
      .attr("width", document.getElementById("chart-d3").clientWidth)
      .attr("height", document.getElementById("chart-d3").clientHeight)
      .call(
        d3
          .zoom()
          .scaleExtent([params.zoomMin, params.zoomMax])
          .on("zoom", handleZoom)
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

function renderChart(data) {
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
        enableArticle(d);
      });

    if (d.numRecentArticles <= 50) {
      group
        .append("circle")
        .attr("cx", xScale(d.x))
        .attr("cy", yScale(d.y))
        .attr("r", 3)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles <= 200) {
      group
        .append("circle")
        .attr("cx", xScale(d.x))
        .attr("cy", yScale(d.y))
        .attr("r", 4)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles <= 500) {
      group
        .append("circle")
        .attr("cx", xScale(d.x))
        .attr("cy", yScale(d.y))
        .attr("r", 5)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);

      group
        .append("circle")
        .attr("cx", xScale(d.x))
        .attr("cy", yScale(d.y))
        .attr("r", 2)
        .style("fill", "black")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles <= 1000) {
      group
        .append("circle")
        .attr("cx", xScale(d.x))
        .attr("cy", yScale(d.y))
        .attr("r", 6)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);

      group
        .append("circle")
        .attr("cx", xScale(d.x))
        .attr("cy", yScale(d.y))
        .attr("r", 3)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);
    } else if (d.numRecentArticles > 1000) {
      group
        .append("circle")
        .attr("cx", xScale(d.x))
        .attr("cy", yScale(d.y))
        .attr("r", 7)
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", 1);

      group
        .append("circle")
        .attr("cx", xScale(d.x))
        .attr("cy", yScale(d.y))
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
      group.selectAll("circle").attr("cx", xScale(d.x)).attr("cy", yScale(d.y));
    } else if (d.numRecentArticles <= 200) {
      group.selectAll("circle").attr("cx", xScale(d.x)).attr("cy", yScale(d.y));
    } else if (d.numRecentArticles <= 500) {
      // two circles
      group.selectAll("circle").attr("cx", xScale(d.x)).attr("cy", yScale(d.y));
      //   group.select("circle").attr("cx", xScale(d.x)).attr("cy", yScale(d.y));
    } else if (d.numRecentArticles <= 1000) {
      group.selectAll("circle").attr("cx", xScale(d.x)).attr("cy", yScale(d.y));
    } else if (d.numRecentArticles > 1000) {
      group.selectAll("circle").attr("cx", xScale(d.x)).attr("cy", yScale(d.y));
    }
  });

  // EXIT phase for removed data points
  shapes.exit().remove();
}

function handleZoom(event) {
  zoomTransform = event.transform;

  // update scales
  const width = document.getElementById("chart-d3").clientWidth;
  const height = document.getElementById("chart-d3").clientHeight;
  updateGlobalScaleDomains(width, height);
  transformLocalScaleDomains(zoomTransform);
  updateScaleRanges(width, height);

  // update points
  const _data = getDataPointsToRender(data, xScale, yScale);
  renderChart(_data);

  // update annotation
  updateAnnotation(null, xScale, yScale);

  // update foreground
  foreground.updateForeground(xScale, yScale, zoomTransform.k);
}

function handleResize() {
  const width = document.getElementById("chart-d3").clientWidth;
  const height = document.getElementById("chart-d3").clientHeight;
  updateGlobalScaleDomains(width, height);
  transformLocalScaleDomains(zoomTransform);
  updateScaleRanges(width, height);
  d3.select("svg").attr("width", width).attr("height", height);

  const _data = getDataPointsToRender(data, xScale, yScale);
  renderChart(_data);
}

function disableArticle() {
  const article = document.getElementById("article");
  article.style.visibility = "hidden";
}

function enableArticle(dataPoint) {
  const article = document.getElementById("article");
  buildArticle(dataPoint);
  article.style.visibility = "visible";
}

function buildArticle(dataPoint) {
  const article = document.getElementById("article-content");
  const url =
    "https://sciencemap.eto.tech/cluster/?version=2&cluster_id=" +
    dataPoint.clusterId;

  article.innerHTML = buildArticleContent(dataPoint, url);

  const articleClose = document.getElementById("article-close");
  articleClose.onclick = () => {
    disableArticle();
  };

  const articleOpen = document.getElementById("article-open");
  articleOpen.onclick = () => {
    window.open(url, "_blank");
  };
}

function buildArticleContent(dataPoint, url) {
  const html =
    buildDataPointDetails(dataPoint) +
    "<strong>More details from ETO</strong><br />" +
    "<iframe src='" +
    url +
    "' width='100%' height='100%'></iframe>";

  return html;
}

function buildAnnotation(dataPoint) {
  const annotation = document.getElementById("annotation-body");

  annotation.innerHTML = buildDataPointDetails(dataPoint);
}

function enableAnnotation(dataPoint, xScale, yScale) {
  const annotation = document.getElementById("annotation");

  const x = xScale(dataPoint.x);
  const y = yScale(dataPoint.y);

  annotation.style.visibility = "visible";
  annotation.style.top = y + "px";
  annotation.style.left = x + "px";
}

function disableAnnotation() {
  const annotation = document.getElementById("annotation");
  annotation.style.visibility = "hidden";
}

function updateAnnotation(dataPoint, xScale, yScale) {
  if (dataPoint == null) {
    disableAnnotation();
  } else {
    buildAnnotation(dataPoint);
    enableAnnotation(dataPoint, xScale, yScale);
  }
}

function buildDataPointDetails(dataPoint) {
  let html = "";

  // cluster id
  html += "<strong>#" + dataPoint.clusterId + "</strong>" + "<br />";

  // cluster category
  html += clusterCategoryIdToText(dataPoint.clusterCategoryId) + "<br />";

  // number of articles
  if (dataPoint.numRecentArticles <= 100) {
    html += "<span class='few-articles'>";
  } else if (dataPoint.numRecentArticles >= 1000) {
    html += "<span class='many-articles'>";
  } else {
    html += "<span>";
  }
  html += "articles: " + dataPoint.numRecentArticles + "</span><br />";

  // growth rating
  if (dataPoint.growthRating >= 80) {
    html += "<span class='many-articles'>";
  } else {
    html += "<span>";
  }
  html += "growth: " + dataPoint.growthRating + "</span><br />";

  // key concepts

  html += "<br /><strong>key concepts:</strong><ul>";

  for (const concept_id of dataPoint.keyConcepts) {
    html += "<li>" + concepts[Number(concept_id)] + "</li>";
  }

  html += "</ul>";
  return html;
}

// ---------------------------------
enableLoadingScreen();
loadConcepts();
loadDataPoints();
// ---------------------------------
