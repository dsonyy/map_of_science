import * as d3 from "d3";
import { selectForegroundSvg, getForegroundLayers } from "./foreground";

const LABEL_TEXT_SIZE = 24;

class Label {
  constructor(html, x, y) {
    this.html = html;
    this.x = x;
    this.y = y;
  }
}

export function initLabels() {
  getForegroundLayers().forEach((layer) => {
    const element = d3.select(layer).append("g").attr("id", "labels");
    getLabelsFromSvgGroup(layer).forEach((label) => {
      element
        .append("text")
        .attr("x", label.x)
        .attr("y", label.y)
        .text(label.html);
    });
  });
}

export function updateLabels(kZoom) {
  getForegroundLayers().forEach((layer) => {
    const labels = d3.select(layer).select("#labels").selectAll("text");
    labels.style("font-size", function (d, i) {
      return LABEL_TEXT_SIZE / kZoom + "px";
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
