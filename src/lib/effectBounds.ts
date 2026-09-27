/** Cache layout dimensions until the element actually changes size. */
export function observeEffectBounds(element: HTMLElement) {
  const bounds = { width: element.clientWidth, height: element.clientHeight };
  const observer = new ResizeObserver(() => {
    bounds.width = element.clientWidth;
    bounds.height = element.clientHeight;
  });
  observer.observe(element);
  return { bounds, disconnect: () => observer.disconnect() };
}
