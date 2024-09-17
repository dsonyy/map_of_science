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

function labelTextToLabelId(labelText) {
  return labelText
    .toLowerCase() // Convert to lowercase
    .replace(/[^a-z0-9]+/g, "_") // Replace non-alphanumeric characters with underscores
    .replace(/^_+|_+$/g, ""); // Trim leading and trailing underscores
}

function labelTextToArticleUri(labelText) {
  const labelId = labelTextToLabelId(labelText);
  return `../../articles/${labelId}.html`; // Assuming the HTML files are in the 'articles' directory
}

async function fetchArticle(labelText) {
  const articleUri = labelTextToArticleUri(labelText);
  try {
    const response = await fetch(articleUri);
    if (response.ok) {
      const content = await response.text();
      return content;
    }
    return "<p>Content not found.</p>";
  } catch (error) {
    console.error("Error fetching article content:", error);
    return "<p>Error loading content.</p>";
  }
}

function buildLabelArticle(labelText) {
  const article = document.getElementById("article-content");

  // wait for fetchArticle
  fetchArticle(labelText).then((content) => {
    article.innerHTML =
      "<h1>" +
      labelText +
      "</h1>" +
      "<h2>" +
      labelTextToLabelId(labelText) +
      "</h2>" +
      content;
  });

  console.log(labelText);

  const articleClose = document.getElementById("article-close");
  articleClose.onclick = () => {
    disableArticle();
  };

  const articleOpen = document.getElementById("article-open");
  articleOpen.onclick = () => {
    window.open("", "_blank");
  };
}

export function enableLabelArticle(labelText) {
  const article = document.getElementById("article");
  buildLabelArticle(labelText);
  article.style.visibility = "visible";
}
