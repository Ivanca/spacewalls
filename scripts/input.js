
import TinyGesture from '../TinyGesture.js';
import { mainCanvas, getPaused } from '../littlejs.esm.min.js';
import {state} from './state.js';
let swipeUp = false;
let swipeDown = false;
let swipeLeft = false;
let swipeRight = false;
let tap = false;
let gesture = null;
 // Add swipe event handlers
export function setupGestureControls() {
    // Clean up existing gesture instance if it exists
    if (gesture) {
        gesture.destroy();
    }

    // Initialize gesture on the main canvas
    gesture = new TinyGesture(document.body, {
        threshold: (type, self) => Math.max(22, Math.floor(0.05 * window.innerHeight)),
        velocityThreshold: 0,
        diagonalSwipes: false,
        mouseSupport: false, // Disable mouse support to avoid conflicts with keyboard
    });

	gesture.on('swipeup', () => {
		if (!state.gameOver && !getPaused()) {
			swipeUp = true;
		}
	});

	gesture.on('swipedown', () => {
		if (!state.gameOver && !getPaused()) {
			swipeDown = true;
		}
	});

	gesture.on('swipeleft', () => {
		if (!state.gameOver && !getPaused()) {
			swipeLeft = true;
		}
	});

	gesture.on('swiperight', () => {
		if (!state.gameOver && !getPaused()) {
			swipeRight = true;
		}
	});

    
    gesture.on('tap', (event) => {
        tap = true;
    });
}

let timeOut = null;
export const getTap = () => {
    if (tap && !timeOut) {
        timeOut = setTimeout(() => {
            timeOut = null;
            tap = false;
        }, 50); // Reset tap after 50ms
    }
    return tap;
};

export const resetTap = () => {
    tap = false;
    clearTimeout(timeOut);
    timeOut = null;
}

export const getLastSwipeDirection = () => {
    let toReturn = null;
    if (swipeUp) toReturn = 'up';
    if (swipeDown) toReturn = 'down';
    if (swipeLeft) toReturn = 'left';
    if (swipeRight) toReturn = 'right';
    swipeUp = false;
    swipeDown = false;
    swipeLeft = false;
    swipeRight = false;
    return toReturn;
};