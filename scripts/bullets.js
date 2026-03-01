import {
	vec2, isOverlapping, time, mousePos,
} from '../littlejs.esm.js';
import {state} from './state.js';
import {worldSize, blackHoleRadius, promotedThreshold} from './constants.js';
import {sBullet, sWall, sHit} from './sounds.js';
import {hasClearShot} from './stations.js';
import {handleCollisionWithWalls} from './walls.js';
import {GUNS, GUN_BY_LEVEL} from './guns.js';

export function shootBullet() {
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

	const gun = GUNS[best.gun] ?? GUNS.basic;

	if (time - best.lastBulletTime <= gun.fireRate) {
		return;
	}

	const dirToMouse = mousePos.subtract(best.pos).normalize();
	const baseAngle = Math.atan2(dirToMouse.y, dirToMouse.x);

	for (let i = 0; i < gun.bullets.length; i++) {
		const bulletDef = gun.bullets[i];
		const angle = baseAngle + bulletDef.angleOffset;
		const vel = vec2(Math.cos(angle), Math.sin(angle)).normalize(bulletDef.speed);
		state.bullets.push({pos: best.pos, vel, sourceStation: i === 0 ? best : null});
	}

	sBullet.play(best.pos);
	best.lastBulletTime = time;
}

export function updateBullets() {
	for (const l of state.bullets) {
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
					if (l.sourceStation) {
						l.sourceStation.kills++;
						const level = Math.floor(l.sourceStation.kills / promotedThreshold);
						if (level > l.sourceStation.level && level < 3) {
							l.sourceStation.level = level;
							l.sourceStation.gun = GUN_BY_LEVEL[level] ?? l.sourceStation.gun;
							l.sourceStation.promotedTime = time;
						}
					}
				}

				l.hit = true;
				sHit.play(inv.pos);
			}
		}
	}

	state.bullets = state.bullets.filter(({hit, pos}) => {
		const {x, y} = pos;
		if (hit) {
			return false;
		}

		return x > -2 && x < worldSize.x + 2 && y > -2 && y < worldSize.y + 2;
	});
}
