function screenCoordsToMapCoords(x, y, xScale, yScale) {
  return [xScale.invert(x), yScale.invert(y)];
}

function mapCoordsToScreenCoords(x, y, xScale, yScale) {
  return [xScale(x), yScale(y)];
}
