import * as d3 from "d3";
import { getForegroundLayers, getForegroundVisibilities } from "./foreground";
import * as article from "./article";
import {
  IS_LABEL_ZOOM_SCALING,
  LABEL_ZOOM_SCALE_FACTOR_K,
  LABEL_ZOOM_SCALE_FACTOR_MAX,
  LABEL_ZOOM_SCALE_FACTOR_MIN,
} from "./config";
import { data } from "./points";

class Label {
  constructor(html, x, y) {
    this.html = html;
    this.x = x;
    this.y = y;
  }
}

export function initLabels(xScale, yScale, kZoom) {
  article.fetchAvailableArticlesList().then(() => {
    buildLabelsDiv();
    initLabelsAfterFetchingArticlesList();
    updateLabels(xScale, yScale, kZoom);
  });
}

function initLabelsAfterFetchingArticlesList() {
  [...getForegroundLayers()].reverse().forEach((layer, i) => {
    const layer_no = getForegroundLayers().length - 1 - i;
    buildLabelsDivLayer(layer_no);
    const LabelsDivLayer = getLabelsDivLayer(layer_no);
    const orgFontSize = getFontSizeInPx(LabelsDivLayer);

    getLabelsFromSvgGroup(layer).forEach((label) => {
      LabelsDivLayer.append("div")
        .attr("x", label.x)
        .attr("y", label.y)
        .attr("org-font-size", orgFontSize)
        .classed("label", true)
        .classed("label-available", article.isArticleAvailable(label.html))
        .classed("label-unavailable", !article.isArticleAvailable(label.html))
        .text(label.html);
    });

    // Add city labels to the last layer
    if (layer_no === getForegroundLayers().length - 1) {
      data.forEach((dataPoint) => {
        if (dataPoint.cityLabel) {
          LabelsDivLayer.append("div")
            .attr("x", dataPoint.x)
            .attr("y", dataPoint.y)
            .attr("org-font-size", orgFontSize)
            .classed("label", true)
            .classed("city-label", true)
            .text(dataPoint.cityLabel);
        }
      });
    }
  });
}

function calcLabelFontSize(orgFontSizeInPx, kZoom) {
  if (!IS_LABEL_ZOOM_SCALING) return orgFontSizeInPx + "px";

  const s = Math.min(
    Math.max(LABEL_ZOOM_SCALE_FACTOR_MIN, kZoom * LABEL_ZOOM_SCALE_FACTOR_K),
    LABEL_ZOOM_SCALE_FACTOR_MAX,
  );
  const size = orgFontSizeInPx * Math.sqrt(s) + "px";
  return size;
}

function getFontSizeInPx(element) {
  return parseFloat(element.style("font-size"));
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
        const isCityLabel = label.classed("city-label");
        const xMoved = xScale(x);
        const yMoved = yScale(isCityLabel ? y : -y);
        const orgFontSize = label.attr("org-font-size");
        const isAvailable =
          !isCityLabel && article.isArticleAvailable(label.text());

        label
          .style("left", xMoved + "px")
          .style("top", yMoved + "px")
          .style("opacity", visibilities[layer_no])
          .style("display", visibilities[layer_no] == 0 ? "none" : "block")
          .style("font-size", calcLabelFontSize(orgFontSize, kZoom));

        if (!isCityLabel) {
          label.on("click", () => handleClickLabel(isAvailable, labels[index]));
        }
      });
  });
}

export function getLabelsFromSvgGroup(svgGroup) {
  const labels = [];
  d3.select(svgGroup)
    .selectAll("path, rect")
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
    bbox.y + bbox.height / 2,
  );
}

function handleClickLabel(isAvailable, label) {
  if (!isAvailable) return;

  const labelId = label.innerHTML;
  article.enableLabelArticle(labelId);
}
