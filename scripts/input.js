
import TinyGesture from '../TinyGesture.js';
import { mainCanvas, getPaused, screenToWorld, vec2 } from '../littlejs.esm.min.js';
import {state} from './state.js';
import {shootBullet, tryShootHealingBullet} from './bullets.js';

// Track active touches for multi-finger shooting
const activeTouches = new Map(); // Map of touchId -> {pos, lastShotTime}


// Handle touchstart event
function handleTouchStart(event) {
	if (state.gameOver || getPaused() || state.snake) return;
	
	for (const touch of event.touches) {
		const worldPos = screenToWorld(vec2(touch.clientX, touch.clientY));
		activeTouches.set(touch.identifier, {
			pos: worldPos,
			lastShotTime: 0,
		});
		
		// Try healing shot on touch start
		tryShootHealingBullet(worldPos);
	}
}

// Handle touchmove event
function handleTouchMove(event) {
	if (state.gameOver || getPaused() || state.snake) return;
    let touchCounter = 0;
	
	for (const touch of event.touches) {
		const worldPos = screenToWorld(vec2(touch.clientX, touch.clientY));
		
		if (activeTouches.has(touch.identifier)) {
            touchCounter++;
            if (touchCounter > 2) {
                return; // Limit to 2 simultaneous touches
            }
			const touchData = activeTouches.get(touch.identifier);
			touchData.pos = worldPos;
			
			// Shoot continuously for each active touch
			shootBullet(worldPos);
		}
	}
}

// Handle touchend event
function handleTouchEnd(event) {
	for (const touch of event.changedTouches) {
		activeTouches.delete(touch.identifier);
	}
}

// Setup touch event listeners
export function setupTouchControls() {
	mainCanvas.addEventListener('touchstart', handleTouchStart, { passive: true });
	mainCanvas.addEventListener('touchmove', handleTouchMove, { passive: true });
	mainCanvas.addEventListener('touchend', handleTouchEnd, { passive: true });
	mainCanvas.addEventListener('touchcancel', handleTouchEnd, { passive: true });
}

// Cleanup touch event listeners
export function removeTouchControls() {
	mainCanvas.removeEventListener('touchstart', handleTouchStart);
	mainCanvas.removeEventListener('touchmove', handleTouchMove);
	mainCanvas.removeEventListener('touchend', handleTouchEnd);
	mainCanvas.removeEventListener('touchcancel', handleTouchEnd);
}

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