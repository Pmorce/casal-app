/**
 * Is there an in-app history entry behind the current one? React Router's browser/hash histories keep the position
 * in `window.history.state.idx`. After a reload an editor can be entry 0 (its location key survives the reload, so
 * it is no signal), and going back from it would leave the app. Read it when acting, not while rendering.
 */
export function hasEntryBehind(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx
  return typeof idx === 'number' && idx > 0
}
