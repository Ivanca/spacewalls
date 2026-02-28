import {worldSize} from './constants.js';
import {vec2} from '../littlejs.esm.js';

let starsPositions = [];
export function initializeStars() {
	starsPositions = [];
	for (let i = 0; i < 200; i++) {
		starsPositions.push(vec2(Math.random() * worldSize.x, Math.random() * worldSize.y));
	}
}

export function getStarsPositions() {
    return starsPositions;
}