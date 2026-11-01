/** Routes map clicks without a circular dependency between selection and layers. */
let selectionHandler = () => {};
export function configureMapClickHandler(handler) {
  selectionHandler = handler;
}
export function handleMapClick(event) {
  selectionHandler(event);
}
