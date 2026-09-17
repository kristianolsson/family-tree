import '@testing-library/jest-dom/vitest';

// jsdom does not implement the Web Animations API, which Svelte 5's
// svelte/transition helpers (e.g. `fade`) call via element.animate().
// Svelte reads `animation.onfinish` (a setter) and `.currentTime`/`.playState`
// to drive its transition state machine, so a bare no-op stub isn't enough:
// we schedule the assigned `onfinish` callback asynchronously so transitions
// actually complete (and outgoing elements get removed) under jsdom.
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = () => {
    let onfinishHandler = null;
    return {
      currentTime: 0,
      playState: 'finished',
      effect: null,
      cancel() {},
      play() {},
      pause() {},
      reverse() {},
      finish() {},
      commitStyles() {},
      updatePlaybackRate() {},
      addEventListener() {},
      removeEventListener() {},
      set onfinish(fn) {
        onfinishHandler = fn;
        if (fn) setTimeout(fn, 0);
      },
      get onfinish() {
        return onfinishHandler;
      }
    };
  };
}
