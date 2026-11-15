// The online edition has no edition marker and keeps its existing behavior.
// Only the separately built offline site receives this meta tag.
export const isOfflineEdition = typeof document !== 'undefined' &&
  document.querySelector?.('meta[name="burmese-edition"]')?.content === 'offline';
