import {
	vec2, isOverlapping, time, mousePos,
} from '../littlejs.esm.js';
import {state} from './state.js';
import {worldSize, blackHoleRadius} from './constants.js';
import {sLaser, sWall, sHit} from './sounds.js';
import {hasClearShot} from './stations.js';
import {handleCollisionWithWalls} from './walls.js';

export function shootLaser() {
	if (time - state.lastLaserTime < 0.1) {
		return;
	}

	const alive = state.stations.filter(s => s.hp > 0);
	if (!alive.length) {
		return;
	}

	// Find stations with a clear shot to the mouse
	const clearShot = alive.filter(s => hasClearShot(s.pos, mousePos));

	// Pick closest among clear-shot stations, or fall back to closest overall
	const candidates = clearShot.length ? clearShot : alive;
	let best = candidates[0];
	let minDist = mousePos.distance(best.pos);
	for (const s of candidates) {
		const d = mousePos.distance(s.pos);
		if (d < minDist) {
			minDist = d;
			best = s;
		}
	}

	const dirToMouse = mousePos.subtract(best.pos).normalize(0.6);
	state.lasers.push({pos: best.pos, vel: dirToMouse});
	sLaser.play(best.pos);
	state.lastLaserTime = time;
}

export function updateLasers() {
	for (const l of state.lasers) {
		l.pos = l.pos.add(l.vel);

		// Collide with walls
		const hit = handleCollisionWithWalls(l.pos, vec2(0.3, 0.3));
		if (hit) {
			l.hit = true;
			sWall.play(l.pos);
		}

		// Absorbed by black hole inner radius
		if (state.blackHole) {
			const dx = l.pos.x - state.blackHole.pos.x;
			const dy = l.pos.y - state.blackHole.pos.y;
			if ((dx * dx) + (dy * dy) < blackHoleRadius * blackHoleRadius) {
				l.hit = true;
			}
		}

		// Collide with invaders
		for (const inv of state.invaders) {
			if (isOverlapping(l.pos, vec2(0.3, 0.3), inv.pos, inv.size)) {
				const wasAlive = inv.hp > 0;
				inv.hp -= 2;
				if (wasAlive && inv.hp <= 0) {
					state.killScore++;
				}

				l.hit = true;
				sHit.play(inv.pos);
			}
		}
	}

	state.lasers = state.lasers.filter(({hit, pos}) => {
		const {x, y} = pos;
		if (hit) {
			return false;
		}

		return x > -2 && x < worldSize.x + 2 && y > -2 && y < worldSize.y + 2;
	});
	state.invaders = state.invaders.filter(i => i.hp > 0);
}
