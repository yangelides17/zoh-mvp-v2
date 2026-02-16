/**
 * Spotify iFrame API SDK loader.
 *
 * Exports a promise that resolves with the IFrameAPI object once the SDK
 * calls window.onSpotifyIframeApiReady. Safe to await from multiple callers.
 */

let resolveApi;
const spotifyIframeApiReady = new Promise((resolve) => {
  resolveApi = resolve;
});

if (typeof window !== 'undefined') {
  // Defensive: SDK may have loaded before this module was evaluated
  if (window.SpotifyIframeApi) {
    resolveApi(window.SpotifyIframeApi);
  }

  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    window.SpotifyIframeApi = IFrameAPI;
    resolveApi(IFrameAPI);
  };
}

export default spotifyIframeApiReady;
