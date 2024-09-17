import * as points from "./points";

export function disableArticle() {
  const article = document.getElementById("article");
  article.style.visibility = "hidden";
}

export function enableArticle(dataPoint) {
  const article = document.getElementById("article");
  buildArticle(dataPoint);
  article.style.visibility = "visible";
}

function buildArticle(dataPoint) {
  const article = document.getElementById("article-content");
  const url =
    "https://sciencemap.eto.tech/cluster/?version=2&cluster_id=" +
    dataPoint.clusterId;

  article.innerHTML = buildArticleContent(dataPoint, url);

  const articleClose = document.getElementById("article-close");
  articleClose.onclick = () => {
    disableArticle();
  };

  const articleOpen = document.getElementById("article-open");
  articleOpen.onclick = () => {
    window.open(url, "_blank");
  };
}

function buildArticleContent(dataPoint, url) {
  const html =
    points.buildDataPointDetails(dataPoint) +
    "<strong>More details from ETO</strong><br />" +
    "<iframe src='" +
    url +
    "' width='100%' height='100%'></iframe>";

  return html;
}
