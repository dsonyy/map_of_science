import * as d3 from "d3";
import Foreground from "../../asset/foreground.svg";
import { zoomMax } from "./params";
import * as labels from "./labels";

export function initForeground(xScale, yScale, kZoom) {
  selectForegroundSvg()
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", "0 0 100 100");

  const initialZoom = 1.0;
  updateForeground(xScale, yScale, initialZoom);

  labels.initLabels(xScale, yScale, kZoom);
}

export function updateForeground(xScale, yScale, kZoom) {
  updateForegroundScaling(xScale, yScale);
  updateForegroundVisibility(kZoom);
  labels.updateLabels(xScale, yScale, kZoom);
}

export function selectForegroundSvg() {
  return d3.select("#chart").select("#foreground").select("svg");
}

function setForegroundLayerVisibility(layer, visibility) {
  layer.style.opacity = visibility;
}

function calcForegroundLayerVisibility(k, kStart, kStop, kRadius) {
  if (k <= kStart) {
    return 0.0;
  } else if (kStart < k && k <= kStop) {
    return 1.0;
  } else if (kStop < k && k <= kStop + kRadius) {
    return 1.0 - (k - kStop) / kRadius;
  } else {
    return 0.0;
  }
}

function updateForegroundVisibility(kZoom) {
  if (kZoom == null || kZoom <= 0) {
    return;
  }

  const min = -10.0;
  const max = zoomMax * 0.8;
  const layers = getForegroundLayers();
  const no = layers.length;
  const layerZoomRange = (max - min) / no;

  layers.forEach((layer, index) => {
    const layerMinZoom = min + index * layerZoomRange;
    const layerMaxZoom = min + (index + 1) * layerZoomRange;

    const radius = 10.0;
    const visibility = calcForegroundLayerVisibility(
      kZoom,
      layerMinZoom,
      index == no - 1 ? zoomMax + radius : layerMaxZoom,
      radius
    );
    setForegroundLayerVisibility(layer, visibility);
  });
}

function sortForegroundLayers(layers) {
  return layers.sort((a, b) => a.id.localeCompare(b.id));
}

export function getForegroundLayers() {
  const layers = selectForegroundSvg()
    .selectAll(":scope > g")
    .filter(function () {
      // Filter out <g> elements where the display property is set to 'none'
      return d3.select(this).style("display") !== "none";
    })
    .nodes();
  return sortForegroundLayers(layers);
}

function updateForegroundScaling(xScale, yScale) {
  const width = xScale.domain()[1] - xScale.domain()[0];
  const height = yScale.domain()[1] - yScale.domain()[0];
  const x = xScale.domain()[0];
  const y = yScale.domain()[0];

  // we need to convert to the SVG coordinate system
  const y_prim = -y - height;

  selectForegroundSvg().attr("viewBox", `${x} ${y_prim} ${width} ${height}`);
}
