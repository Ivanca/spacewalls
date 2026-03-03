import {setCameraPos, setCameraScale, engineInit, setInputPreventDefault, isTouchDevice} from '../littlejs.esm.js';
import {worldSize} from './constants.js';
import {imagesSrcArray} from './assets.js';
import {resetGame, gameUpdate, gameUpdatePost} from './state.js';
import {setupGestureControls} from './input.js';
import {gameRender, gameRenderPost} from './render.js';

const TILE_SIZE = window.innerHeight / (isTouchDevice ? 35 : 41); // pixels per world unit (camera scale)

function computeWorldSize() {
	worldSize.x = Math.ceil(window.innerWidth  / TILE_SIZE);
	worldSize.y = Math.ceil(window.innerHeight / TILE_SIZE);
}

function isPortrait() {
	return window.innerHeight > window.innerWidth;
}

// ── Rotate-device overlay ──────────────────────────────────────────────────
const rotateOverlay = document.getElementById('rotate-overlay');

// ── Engine bootstrap (called once, when in landscape) ─────────────────────
let engineStarted = false;

function startEngine() {
	if (engineStarted) return;
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
	setCameraScale(TILE_SIZE);

	resetGame();
}

// ── Orientation / resize listener ─────────────────────────────────────────
function onOrientationChange() {
	if (isPortrait()) {
		if (rotateOverlay) rotateOverlay.style.display = 'flex';
	} else {
		setTimeout(() => {
			startEngine();
		}, 500);
		if (rotateOverlay) rotateOverlay.style.display = 'none';
	}
}

window.addEventListener('resize', onOrientationChange);

// Kick off immediately
if (isPortrait()) {
	if (rotateOverlay) rotateOverlay.style.display = 'flex';
} else {
	startEngine();
}
