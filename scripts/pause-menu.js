import {setPaused} from '../littlejs.esm.min.js';
import {credits} from './constants.js';
import {resetGame} from './state.js';
import {resetTap} from './input.js';

// ── Pause button & pause menu (touch devices only) ────────────────────────
export const pauseBtn        = document.getElementById('pause-btn');
const pauseMenu       = document.getElementById('pause-menu');
const pauseResumeBtn  = document.getElementById('pause-resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const pauseAboutBtn   = document.getElementById('pause-about-btn');
const pauseExitBtn    = document.getElementById('pause-exit-btn');
const outroOverlayEl  = document.getElementById('outro-overlay');
const outroBtnRow     = document.getElementById('outro-btn-row');
const creditsPanel    = document.getElementById('credits-panel');
const creditsText     = document.getElementById('credits-text');
const aboutCloseBtn   = document.getElementById('about-close-btn');


export function openPauseMenu() {
	resetTap();
	setPaused(true);
	pauseMenu.style.display = 'flex';
}

export function closePauseMenu() {
	pauseMenu.style.display = 'none';
}

export function resumeGame() {
	closePauseMenu();
	setPaused(false);
	resetTap();
}

export function initPauseMenu() {

	pauseBtn.addEventListener('click', () => {
		if (pauseMenu.style.display === 'flex') {
			resumeGame();
		} else {
			openPauseMenu();
		}
	});

	pauseResumeBtn.addEventListener('click', () => {
		resumeGame();
	});

	pauseRestartBtn.addEventListener('click', () => {
		closePauseMenu();
		resetGame(false);
	});

	pauseAboutBtn.addEventListener('click', () => {
		closePauseMenu();
		// Populate and show credits inside the outro-overlay
		if (creditsText) creditsText.textContent = credits.trim();
		if (creditsPanel) creditsPanel.style.display = 'flex';
		if (outroOverlayEl) {
			outroOverlayEl.classList.add('credits-mode');
			outroOverlayEl.style.display = 'block';
		}
	});

	aboutCloseBtn.addEventListener('click', () => {
		// Restore outro-overlay to its default state
		if (creditsPanel) creditsPanel.style.display = 'none';
		if (outroBtnRow) outroBtnRow.style.display = '';
		if (outroOverlayEl) {
			outroOverlayEl.classList.remove('credits-mode');
			outroOverlayEl.style.display = 'none';
		}
		// Re-open pause menu (game stays paused)
		pauseMenu.style.display = 'flex';
	});

	pauseExitBtn.addEventListener('click', () => {
		window.close();
	});
}

export function showPauseButton() {
	if (pauseBtn.style.display !== 'flex') {
		pauseBtn.style.display = 'flex';
	}
}

export function hidePauseButton() {
	pauseBtn.style.display = 'none';
}

pauseBtn.style.display = 'none';
console.log(pauseBtn.style.display)
