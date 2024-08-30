import * as d3 from "d3";
import { selectForegroundSvg } from "./foreground";

class Label {
  constructor(html, x, y) {
    this.html = html;
    this.x = x;
    this.y = y;
  }
}

export function initLabels() {
  const fg = selectForegroundSvg();
}

export function updateLabels() {}

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
  return new Label(getLabelTextFromSvgElement(svgElement), 100, 100);
}
