import * as points from "./points";

function buildAnnotation(dataPoint) {
  const annotation = document.getElementById("annotation-body");

  annotation.innerHTML = points.buildDataPointDetails(dataPoint);
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

export function updateAnnotation(dataPoint, xScale, yScale) {
  if (dataPoint == null) {
    disableAnnotation();
  } else {
    buildAnnotation(dataPoint);
    enableAnnotation(dataPoint, xScale, yScale);
  }
}
