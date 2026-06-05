// Route prefetching — prefetch Fresh island bundles on link hover
// so route transitions feel instant (<150ms target).

const prefetched = new Set<string>();

export function prefetchRoute(href: string) {
  if (prefetched.has(href)) return;
  prefetched.add(href);
  // Prefetch the HTML page — Fresh will send the island bundles too
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  link.as = "document";
  document.head.appendChild(link);
}

export function prefetchOnHover(element: HTMLElement, href: string) {
  element.addEventListener("mouseenter", () => prefetchRoute(href), {
    once: true,
  });
}
