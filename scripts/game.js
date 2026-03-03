import {setCameraPos, setCameraScale, engineInit, setInputPreventDefault, isTouchDevice, setPaused, getPaused} from '../littlejs.esm.js';
import {worldSize} from './constants.js';
import {imagesSrcArray} from './assets.js';
import {resetGame, gameUpdate, gameUpdatePost, state} from './state.js';
import {setupGestureControls, resetTap} from './input.js';
import {gameRender, gameRenderPost} from './render.js';
import {initPauseMenu} from './pause-menu.js';

const TILE_SIZE = () => window.innerHeight / (isTouchDevice ? 35 : 41); // pixels per world unit (camera scale)

function computeWorldSize() {
	worldSize.x = Math.ceil(window.innerWidth  / TILE_SIZE());
	worldSize.y = Math.ceil(window.innerHeight / TILE_SIZE());
}

function isPortrait() {
	return window.innerHeight > window.innerWidth;
}

// ── Rotate-device overlay ──────────────────────────────────────────────────
const rotateOverlay = document.getElementById('rotate-overlay');

// ── Engine bootstrap (called once, when in landscape) ─────────────────────
let engineStarted = false;

function startEngine() {
	if (engineStarted) {
		return;
	}
	engineStarted = true;

	if (rotateOverlay) {
		rotateOverlay.style.display = 'none';
	}

	computeWorldSize();

	engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, imagesSrcArray);
}

function gameInit() {
	setInputPreventDefault(false);
	setupGestureControls();
	setCameraPos(worldSize.scale(0.5));
	setCameraScale(TILE_SIZE());

	initPauseMenu();
	resetGame();
}

let pausedDueToOrientation = false;

// ── Orientation / resize listener ─────────────────────────────────────────
function onOrientationChange() {
	if (isPortrait()) {
		if (rotateOverlay) {
			if (engineStarted && getPaused() === false) {
				setPaused(true);
				pausedDueToOrientation = true;
			}
			rotateOverlay.style.display = 'flex';
		}
	} else {
		if (engineStarted && pausedDueToOrientation) {
			setPaused(false);
			pausedDueToOrientation = false;
		}
		startEngine();
		if (rotateOverlay) {
			rotateOverlay.style.display = 'none';
		}
	}
}

window.addEventListener('resize', onOrientationChange);

// Kick off immediately
if (isPortrait()) {
	if (rotateOverlay) rotateOverlay.style.display = 'flex';
} else {
	startEngine();
}

async function goFullscreenAndRotate() {
  const element = document.documentElement; // Targets the entire page (<html> element)

  // 1. Request fullscreen mode
  if (!document.fullscreenElement) {
    try {
      await element.requestFullscreen();
      // Use browser-specific prefixes for broader compatibility if needed
      // (e.g., element.webkitRequestFullscreen() for Safari)
    } catch (err) {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    }
  }

  // 2. Lock the screen orientation
  try {
    // Lock to 'landscape' (includes primary and secondary)
    await screen.orientation.lock("landscape");
    console.log("Screen orientation locked to landscape.");
  } catch (err) {
    console.error(`Error attempting to lock orientation: ${err.message}`);
	alert("Unable to lock screen orientation. Please rotate your device to landscape mode manually.");
  }
}

const fullscreenRotateBtn = document.getElementById('fullscreen-rotate-btn');
fullscreenRotateBtn.addEventListener('click', goFullscreenAndRotate);


