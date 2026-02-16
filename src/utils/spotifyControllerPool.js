/**
 * Spotify Controller Pool
 *
 * Manages a pool of reusable Spotify EmbedControllers (max 3). Controllers are
 * created lazily and never destroyed — they persist for the lifetime of the page.
 *
 * Each entry has a role:
 *   'visible'  — the fragment currently on screen (highest priority)
 *   'preload'  — a nearby fragment being pre-loaded (medium priority)
 *   'recent'   — a just-left fragment kept loaded for instant scroll-back (lowest)
 *   null       — parked off-screen, available for reuse
 *
 * The Spotify SDK *replaces* the DOM element passed to createController with an
 * iframe. With multiple controllers we snapshot existing iframes before creation
 * to detect the new one.
 *
 * Usage:
 *   const entry = await claimController(containerEl, spotifyUri, 'preload');
 *   updateRole(entry, 'visible');   // upgrade when fully visible
 *   updateRole(entry, 'recent');    // downgrade when scrolled away
 *   releaseController(entry);       // fully release when out of zone
 */

import spotifyIframeApiReady from './spotifyIframeApi';

const MAX_POOL_SIZE = 3;

// Pool entries: { controller, iframe, uri, role, claimed }
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
 * Steal priority: recent first, then preload, never visible.
 */
function findStealable(role) {
  // For visible/preload claims, steal from recent first
  let victim = pool.find((e) => e.claimed && e.role === 'recent');
  if (victim) return victim;

  // Then steal from preload (but only if the new claim is visible)
  if (role === 'visible') {
    victim = pool.find((e) => e.claimed && e.role === 'preload');
    if (victim) return victim;
  }

  return null;
}

/**
 * Claim a controller for the given container element and Spotify URI.
 *
 * role: 'visible' | 'preload' | 'recent'
 *
 * - If a free (parked) controller exists, reuses it.
 * - If pool isn't full, creates a new one.
 * - If pool is full, steals based on priority (recent > preload > never visible).
 *
 * Returns a pool entry or null if no controller could be obtained.
 */
export async function claimController(containerEl, uri, role = 'preload') {
  // Try to find a free (unclaimed) controller
  let entry = pool.find((e) => !e.claimed);

  if (!entry && pool.length < MAX_POOL_SIZE) {
    const IFrameAPI = await spotifyIframeApiReady;
    const parking = getParkingContainer();

    // Snapshot existing iframes so we can detect the new one
    const existingIframes = new Set(parking.querySelectorAll('iframe'));

    // Create a disposable div for the SDK to replace with the iframe
    const placeholder = document.createElement('div');
    parking.appendChild(placeholder);

    entry = await new Promise((resolve) => {
      IFrameAPI.createController(
        placeholder,
        { uri, width: '100%', height: 232 },
        (controller) => {
          // Find the newly created iframe (not in our snapshot)
          let iframe = null;
          for (const el of parking.querySelectorAll('iframe')) {
            if (!existingIframes.has(el)) {
              iframe = el;
              break;
            }
          }

          if (!iframe) {
            console.warn('[Spotify Pool] SDK did not create an iframe');
            resolve(null);
            return;
          }

          iframe.style.cssText = 'width:100%;height:100%;border:none;border-radius:12px;';

          const newEntry = { controller, iframe, uri, role: null, claimed: false };
          pool.push(newEntry);
          console.log('[Spotify Pool] Controller created, pool size:', pool.length);
          resolve(newEntry);
        }
      );
    });
  }

  if (!entry) {
    // Pool full, try to steal
    entry = findStealable(role);
    if (!entry) return null;
    // Park the stolen entry's iframe
    getParkingContainer().appendChild(entry.iframe);
    console.log('[Spotify Pool] Stole controller from role:', entry.role);
  }

  // Reparent the iframe into the target container
  entry.claimed = true;
  entry.role = role;
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
 * Update the role of an existing pool entry (e.g. preload → visible → recent).
 */
export function updateRole(entry, newRole) {
  if (!entry) return;
  entry.role = newRole;
}

/**
 * Release a controller back to the pool. Parks the iframe off-screen.
 */
export function releaseController(entry) {
  if (!entry) return;
  entry.claimed = false;
  entry.role = null;
  if (entry.iframe) {
    getParkingContainer().appendChild(entry.iframe);
  }
}
