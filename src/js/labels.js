import * as d3 from "d3";
import { getForegroundLayers, getForegroundVisibilities } from "./foreground";

class Label {
  constructor(html, x, y) {
    this.html = html;
    this.x = x;
    this.y = y;
  }
}

export function initLabels(xScale, yScale, kZoom) {
  buildLabelsDiv();

  getForegroundLayers().forEach((layer, layer_no) => {
    buildLabelsDivLayer(layer_no);
    const LabelsDivLayer = getLabelsDivLayer(layer_no);

    getLabelsFromSvgGroup(layer).forEach((label) => {
      LabelsDivLayer.append("div")
        .attr("class", "label")
        .attr("x", label.x)
        .attr("y", label.y)
        .text(label.html);
    });
  });

  updateLabels(xScale, yScale, kZoom);
}

export function updateLabels(xScale, yScale, kZoom) {
  const visibilities = getForegroundVisibilities(kZoom);

  getForegroundLayers().forEach((_, layer_no) => {
    selectLabelsDivLayer(layer_no)
      .selectAll(".label")
      .each((_, index, labels) => {
        const label = d3.select(labels[index]);
        const x = label.attr("x");
        const y = label.attr("y");
        const xMoved = xScale(x);
        const yMoved = yScale(-y);
        label
          .style("left", xMoved + "px")
          .style("top", yMoved + "px")
          .style("opacity", visibilities[layer_no])
          .on("click", () => handleClickLabel(label))
          .on("mouseover", () => handleHoverInLabel(label))
          .on("mouseout", () => handleHoverOutLabel(label));
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

function buildLabelsDivLayer(layer_no) {
  selectLabelsDiv()
    .append("g")
    .attr("id", "labels" + layer_no)
    .attr("class", "noselect");
}

function getLabelsDivLayer(layer_no) {
  return selectLabelsDiv().select("#" + "labels" + layer_no);
}

function buildLabelsDiv() {
  d3.select("#chart").append("div").attr("id", "ff");
}

function selectLabelsDiv() {
  return d3.select("#chart").select("#ff");
}

function selectLabelsDivLayer(layer_no) {
  return selectLabelsDiv().select("#labels" + layer_no);
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

function handleClickLabel(label) {
  console.log(label);
}

function handleHoverInLabel(selection) {
  console.log("Label hovered:", selection);
  selection.classed("label-hover", true);
}

function handleHoverOutLabel(selection) {
  console.log("Label hover out:", selection);
  selection.classed("label-hover", false);
  // d3.select(label).classed("label-hover", false);
}
