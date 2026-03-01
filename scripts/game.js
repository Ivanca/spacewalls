import {setCameraPos, setCameraScale, engineInit} from '../littlejs.esm.js';
import {worldSize} from './constants.js';
import {imagesSrcArray} from './assets.js';
import {resetGame, gameUpdate, gameUpdatePost} from './state.js';
import {gameRender, gameRenderPost} from './render.js';

const TILE_SIZE = 23; // pixels per world unit (camera scale)

function computeWorldSize() {
	worldSize.x = Math.floor(window.innerWidth  / TILE_SIZE);
	worldSize.y = Math.floor(window.innerHeight / TILE_SIZE);
}

function isPortrait() {
	return window.innerHeight > window.innerWidth;
}

// ── Rotate-device overlay ──────────────────────────────────────────────────
const rotateOverlay = document.createElement('div');
rotateOverlay.id = 'rotate-overlay';
rotateOverlay.style.cssText = [
	'position:fixed',
	'inset:0',
	'display:flex',
	'flex-direction:column',
	'align-items:center',
	'justify-content:center',
	'background:#05050d',
	'color:#00e8ff',
	'font-family:PressStart2P,monospace',
	'font-size:clamp(10px,3vw,18px)',
	'text-align:center',
	'padding:24px',
	'z-index:9999',
	'gap:24px',
].join(';');

rotateOverlay.innerHTML = `
	<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24"
		fill="none" stroke="#00e8ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
		style="animation:spin 2s linear infinite">
		<rect x="4" y="2" width="16" height="20" rx="2"/>
		<path d="M9 7l3-3 3 3"/>
		<path d="M15 17l-3 3-3-3"/>
	</svg>
	<span>Please rotate your device<br>to landscape mode</span>
	<style>
		@keyframes spin {
			0%   { transform: rotate(0deg);   }
			40%  { transform: rotate(0deg);   }
			60%  { transform: rotate(90deg);  }
			100% { transform: rotate(90deg);  }
		}
	</style>
`;
document.body.appendChild(rotateOverlay);

// ── Engine bootstrap (called once, when in landscape) ─────────────────────
let engineStarted = false;

function startEngine() {
	if (engineStarted) return;
	engineStarted = true;

	rotateOverlay.style.display = 'none';

	computeWorldSize();

	engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, imagesSrcArray);
}

function gameInit() {
	setCameraPos(worldSize.scale(0.5));
	setCameraScale(TILE_SIZE);

	resetGame();
}

// ── Orientation / resize listener ─────────────────────────────────────────
function onOrientationChange() {
	if (isPortrait()) {
		rotateOverlay.style.display = 'flex';
	} else {
		startEngine();
		rotateOverlay.style.display = 'none';
	}
}

window.addEventListener('resize', onOrientationChange);

// Kick off immediately
if (isPortrait()) {
	rotateOverlay.style.display = 'flex'; // already visible, but be explicit
} else {
	startEngine();
}
