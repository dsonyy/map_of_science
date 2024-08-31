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
    .attr("class", "label");
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
        .append("text")
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
      .selectAll("text")
      .style("font-size", function (d, i) {
        return (
          LABEL_TEXT_SIZE / kZoom +
          (1.0 * LABEL_TEXT_SIZE) / kZoom / (layer_no + 1) +
          "px"
        );
      });
  });

  // selectLabelsSvg()
  //   .selectAll("text")
  //   .style("font-size", function (d, i) {
  //     console.log(d, i);
  //     return LABEL_TEXT_SIZE / kZoom + "px";
  //   });
  updateLabelsScaling(xScale, yScale);
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

function updateLabelsScaling(xScale, yScale) {
  const width = xScale.domain()[1] - xScale.domain()[0];
  const height = yScale.domain()[1] - yScale.domain()[0];
  const x = xScale.domain()[0];
  const y = yScale.domain()[0];

  // we need to convert to the SVG coordinate system
  const y_prim = -y - height;

  selectLabelsSvg().attr("viewBox", `${x} ${y_prim} ${width} ${height}`);
}

function buildLabelsSvg() {
  d3.select("#chart").append("svg").attr("id", "foreground-labels");
}

function selectLabelsSvg() {
  return d3.select("#chart").select("#foreground-labels");
}

function selectLabelsSvgLayer(layer_no) {
  return selectLabelsSvg().select("#labels" + layer_no);
}

function getLabelTextFromSvgElement(svgElement) {
  const element = d3.select(svgElement);
  const inkscapeLabel = element.attr(":inkscape:label");
  const id = element.attr("id");
  return inkscapeLabel ?? id;
}

function getLabelFromSvgElement(svgElement) {
  const bbox = svgElement.getBBox();
  return new Label(
    getLabelTextFromSvgElement(svgElement),
    bbox.x + bbox.width / 2,
    bbox.y + bbox.height / 2
  );
}
