import * as points from "./points.js";

import "../styles.css";

function enableLoadingScreen() {
  document.getElementById("loading").style.display = "block";
  document.getElementById("chart").style.display = "none";
}

enableLoadingScreen();
points.loadConcepts();
points.loadDataPoints();
