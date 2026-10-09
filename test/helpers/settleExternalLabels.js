/**
 * Wait for the real renderer's queued layout and animation frames in integration tests.
 * @param {Viewer} viewer - Viewer whose outside labels have been drawn.
 * @returns {Promise<void>} Resolves when drawing settles; rejects after 120 frames.
 *   Does not change renderer settings or advance private solver state.
 */
export default async function settleExternalLabels(viewer) {
  const host = viewer.annotation._externalLabels;
  for (let frame = 0; frame < 120; frame++) {
    if (host.renderer.stats.phase === 'ready' && host.frames.size === 0) { return; }
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  throw new Error('Outside labels did not settle within 120 frames');
}
