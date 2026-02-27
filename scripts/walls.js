import {isOverlapping} from '../littlejs.esm.js';
import {state} from './state.js';
import {sWallHit} from './sounds.js';

export const handleCollisionWithWalls = (pos, size) => {
	const pointsCrashed = [];
	for (const w of state.walls) {
		const index = state.walls.indexOf(w);
		for (const p of w) {
			if (isOverlapping(pos, size, p.pos, p.size)) {
				pointsCrashed.push({index, p});
			}
		}
	}

	for (const sc of pointsCrashed) {
		const {index} = sc;
		state.walls[index] = state.walls[index].filter(p => p !== sc.p);
	}

	if (pointsCrashed.length) {
		sWallHit.play();
		state.explosions.push({
			pos: pos.copy(), frame: 0, start: Date.now(),
		});
		return true;
	}

	return false;
};
