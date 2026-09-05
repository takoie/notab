/** Focus (and optionally select) an element when it mounts. */
export function focusOnMount(node: HTMLInputElement, select = false) {
  queueMicrotask(() => {
    node.focus();
    if (select) node.select();
  });
  return {};
}
