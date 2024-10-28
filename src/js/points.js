import * as d3 from "d3";
import * as chart from "./chart";

export let data = [];
let concepts = {};
// eslint-disable-next-line no-unused-vars
let quadtree = null;

function parseKeyConceptsRaw(keyConceptsRaw) {
  return keyConceptsRaw.split(",");
}

function parseConceptItem(item) {
  concepts[item["index"]] = item["key"];
}

// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
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

export function buildDataPointDetails(dataPoint) {
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

function handleDataPointsLoaded(dataPoints) {
  console.log("Data Points Loaded");

  // Sort data by num_recent_articles
  dataPoints.sort((a, b) => b.numRecentArticles - a.numRecentArticles);

  // Create a spatial index for rapidly finding the closest data point
  quadtree = buildQuadtree(dataPoints);

  chart.initChart(dataPoints);
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
  // eslint-disable-next-line no-unused-vars
  { data: { items, totalBytes, finished } },
  parseItem,
  dataTarget,
  onLoaded,
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

export function loadDataPoints() {
  loadData(
    new URL("../../asset/data.tsv", import.meta.url),
    parseDataPointItem,
    data, // Separate array for data points
    handleDataPointsLoaded,
  );
}

export function loadConcepts() {
  loadData(
    new URL("../../asset/keys.tsv", import.meta.url),
    parseConceptItem,
    [], // We don't need to store the concepts in an array, they go to the `concepts` object
    handleConceptsLoaded,
  );
}
