/**
 * Spotify Controller Pool
 *
 * Manages a pool of reusable Spotify EmbedControllers. Controllers are created
 * lazily up to MAX_POOL_SIZE and never destroyed — they persist for the lifetime
 * of the page. When not claimed by a VideoEmbed, the controller's iframe is
 * parked in a hidden off-screen container.
 *
 * Note: The Spotify SDK *replaces* the DOM element passed to createController
 * with the iframe (per the docs: "DOM element that you'd like replaced by the
 * Embed"). So we pass a disposable div and then grab the iframe that replaced it.
 *
 * Usage:
 *   const entry = await claimController(containerEl, spotifyUri);
 *   // entry.controller is the EmbedController
 *   // When done: releaseController(entry)
 *
 * Bump MAX_POOL_SIZE to 2-3 later to pre-load nearby embeds.
 */

import spotifyIframeApiReady from './spotifyIframeApi';

const MAX_POOL_SIZE = 1;

// Pool entries: { controller, iframe, uri, claimed }
const pool = [];

// Hidden container to keep unclaimed controller iframes alive in the DOM
let parkingContainer = null;
function getParkingContainer() {
  if (!parkingContainer) {
    parkingContainer = document.createElement('div');
    parkingContainer.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;pointer-events:none;';
    parkingContainer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(parkingContainer);
  }
  return parkingContainer;
}

/**
 * Claim a controller for the given container element and Spotify URI.
 *
 * - If a free (unclaimed) controller exists, reuses it.
 * - If no free controller and pool isn't full, creates a new one.
 * - If pool is full and all claimed, steals the first claimed entry (FIFO).
 *
 * Returns a pool entry: { controller, iframe, uri, claimed }
 */
export async function claimController(containerEl, uri) {
  // Try to find a free (unclaimed) controller
  let entry = pool.find((e) => !e.claimed);

  if (!entry && pool.length < MAX_POOL_SIZE) {
    const IFrameAPI = await spotifyIframeApiReady;
    const parking = getParkingContainer();

    // Create a disposable div for the SDK to replace with the iframe
    const placeholder = document.createElement('div');
    parking.appendChild(placeholder);

    entry = await new Promise((resolve) => {
      IFrameAPI.createController(
        placeholder,
        { uri, width: '100%', height: 232 },
        (controller) => {
          // The SDK replaced `placeholder` with an iframe in the same parent.
          // Find it — it's the iframe the SDK just created in parking.
          const iframe = parking.querySelector('iframe');

          if (!iframe) {
            console.warn('[Spotify Pool] SDK did not create an iframe');
            resolve(null);
            return;
          }

          iframe.style.cssText = 'width:100%;height:100%;border:none;border-radius:12px;';

          const newEntry = { controller, iframe, uri, claimed: false };
          pool.push(newEntry);
          console.log('[Spotify Pool] Controller created, pool size:', pool.length);
          resolve(newEntry);
        }
      );
    });
  }

  if (!entry) {
    // Pool full, all claimed — steal from the first claimed entry
    entry = pool.find((e) => e.claimed);
    if (!entry) return null;
    // Park the stolen entry's iframe
    getParkingContainer().appendChild(entry.iframe);
  }

  // Reparent the iframe into the target container
  entry.claimed = true;
  containerEl.appendChild(entry.iframe);

  // Switch content if URI changed
  if (entry.uri !== uri) {
    entry.uri = uri;
    entry.controller.loadUri(uri);
    console.log('[Spotify Pool] loadUri:', uri);
  }

  return entry;
}

/**
 * Release a controller back to the pool. Parks the iframe off-screen.
 */
export function releaseController(entry) {
  if (!entry) return;
  entry.claimed = false;
  if (entry.iframe) {
    getParkingContainer().appendChild(entry.iframe);
  }
}
