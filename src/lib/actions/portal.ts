/**
 * Move a node to the end of <body> for its lifetime so it escapes any
 * `overflow: hidden` / `overflow-x: auto` ancestor (e.g. the tab strip).
 */
export function portal(node: HTMLElement, target: HTMLElement | string = document.body) {
  const host =
    typeof target === 'string'
      ? (document.querySelector(target) as HTMLElement | null) ?? document.body
      : target;

  host.appendChild(node);

  return {
    destroy() {
      node.remove();
    },
  };
}
