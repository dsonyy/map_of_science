import * as d3 from "d3";
import { selectForegroundSvg, getForegroundLayers } from "./foreground";

const LABEL_TEXT_SIZE = 18;

class Label {
  constructor(html, x, y) {
    this.html = html;
    this.x = x;
    this.y = y;
  }
}

function buildLabelsSvgLayer(layer_no) {
  selectLabelsSvg()
    .append("g")
    .attr("id", "labels" + layer_no)
    .attr("class", "noselect");
}

function getLabelsSvgLayer(layer_no) {
  return selectLabelsSvg().select("#" + "labels" + layer_no);
}

export function initLabels(xScale, yScale, kZoom) {
  buildLabelsSvg();

  getForegroundLayers().forEach((layer, layer_no) => {
    buildLabelsSvgLayer(layer_no);
    const labelsSvgLayer = getLabelsSvgLayer(layer_no);

    getLabelsFromSvgGroup(layer).forEach((label) => {
      labelsSvgLayer
        .append("div")
        .attr("class", "label")
        .attr("x", label.x)
        .attr("y", label.y)
        .text(label.html);
    });
  });

  updateLabels(xScale, yScale, kZoom);
}

export function updateLabels(xScale, yScale, kZoom) {
  getForegroundLayers().forEach((_, layer_no) => {
    selectLabelsSvgLayer(layer_no)
      .selectAll(".label")
      .each((_, index, labels) => {
        const label = d3.select(labels[index]);
        const x = label.attr("x");
        const y = label.attr("y");
        const xMoved = xScale(x);
        const yMoved = yScale(-y);
        label.style("left", xMoved + "px").style("top", yMoved + "px");
      });
  });
}

export function getLabelsFromSvgGroup(svgGroup) {
  const labels = [];
  d3.select(svgGroup)
    .selectAll("path")
    .each((_data, index, nodes) => {
      labels.push(getLabelFromSvgElement(nodes[index]));
    });
  return labels;
}

function buildLabelsSvg() {
  d3.select("#chart").append("div").attr("id", "ff");
}

function selectLabelsSvg() {
  return d3.select("#chart").select("#ff");
}

function selectLabelsSvgLayer(layer_no) {
  return selectLabelsSvg().select("#labels" + layer_no);
}

function getLabelTextFromSvgElement(svgElement) {
  const element = d3.select(svgElement);
  const inkscapeLabel = element.attr(":inkscape:label");
  const id = element.attr("id");
  const text = inkscapeLabel ?? id;
  if (text[0] == "#") return text.slice(1);
  return "";
}

function getLabelFromSvgElement(svgElement) {
  const bbox = svgElement.getBBox();
  return new Label(
    getLabelTextFromSvgElement(svgElement),
    bbox.x + bbox.width / 2,
    bbox.y + bbox.height / 2
  );
}
