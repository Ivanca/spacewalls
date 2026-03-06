import {
	vec2, isOverlapping, time, mousePos,
} from '../littlejs.esm.min.js';
import {state} from './state.js';
import {worldSize, blackHoleRadius, promotedThreshold, stationSize} from './constants.js';
import {sBullet, sWall, sHit} from './sounds.js';
import {hasClearShot} from './stations.js';
import {handleCollisionWithWalls} from './walls.js';
import {GUNS, GUN_BY_LEVEL} from './guns.js';

export function shootBullet(targetPos = mousePos) {
	const alive = state.stations.filter(s => s.hp > 0 && !s.isMedic);
	if (!alive.length) {
		return;
	}
	// Find stations with a clear shot to the target
	const clearShot = alive.filter(s => hasClearShot(s.pos, targetPos));

	// Pick closest among clear-shot stations, or fall back to closest overall
	const candidates = clearShot.length ? clearShot : alive;
	let best = candidates[0];

	let minDist = targetPos.distance(best.pos);
	for (const s of candidates) {
		const d = targetPos.distance(s.pos);
		if (d < minDist) {
			minDist = d;
			best = s;
		}
	}

	const gun = GUNS[best.gun] ?? GUNS.basic;

	if (time - best.lastBulletTime <= gun.fireRate) {
		return;
	}

	const dirToTarget = targetPos.subtract(best.pos).normalize();
	const baseAngle = Math.atan2(dirToTarget.y, dirToTarget.x);

	for (let i = 0; i < gun.bullets.length; i++) {
		const bulletDef = gun.bullets[i];
		const angle = baseAngle + bulletDef.angleOffset;
		const vel = vec2(Math.cos(angle), Math.sin(angle)).normalize(bulletDef.speed);
		state.bullets.push({pos: best.pos, vel, sourceStation: i === 0 ? best : null});
	}
	state.hasShot = true;
	sBullet.play(best.pos);
	best.lastBulletTime = time;
}

export function updateBullets() {
	for (const l of state.bullets) {
		const prevPos = l.pos.copy();
		l.pos = l.pos.add(l.vel);

		// Collide with walls
		const hit = handleCollisionWithWalls(l.pos, vec2(0.3, 0.3), prevPos, 1);
		if (hit) {
			l.hit = true;
			sWall.play(l.pos);
		}

		// Absorbed by black holes inner radius
		for (const bh of state.blackHoles) {
			const dx = l.pos.x - bh.pos.x;
			const dy = l.pos.y - bh.pos.y;
			if ((dx * dx) + (dy * dy) < blackHoleRadius * blackHoleRadius) {
				l.hit = true;
			}
		}

		// Healing bullets: collide with stations to restore HP
		if (l.healing) {
			for (const s of state.stations) {
				if (s.hp > 0 && isOverlapping(l.pos, vec2(0.5, 0.5), s.pos, vec2(3, 2)) && !s.isMedic) {
					s.hp = Math.min(s.maxHp, s.hp + 1);
					l.hit = true;
					sHit.play(s.pos);
					break;
				}
			}
		}

		// Collide with invaders (skip for healing bullets)
		if (!l.healing) {
			for (const inv of state.invaders) {
				if (isOverlapping(l.pos, vec2(0.3, 0.3), inv.pos, inv.size)) {
					const wasAlive = inv.hp > 0;
					inv.hp -= 2;
					if (wasAlive && inv.hp <= 0) {
						state.killScore++;
						state.explosions.push({
							pos: inv.pos.copy(), frame: 0, start: Date.now(),
						});
						if (l.sourceStation) {
							l.sourceStation.kills++;
							let level = l.sourceStation.kills >= promotedThreshold ? 1 : 0;
							if (l.sourceStation.kills >= promotedThreshold * 3) {
								level = 2;
							}
							if (level > l.sourceStation.level && level < 3) {
								l.sourceStation.level = level;
								l.sourceStation.gun = GUN_BY_LEVEL[level] ?? l.sourceStation.gun;
								l.sourceStation.promotedTime = time;
								l.sourceStation.hp = Math.min(l.sourceStation.hp + 2, l.sourceStation.maxHp);
							}
						}
					}

					l.hit = true;
					sHit.play(inv.pos);
				}
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


// Returns true if a healing bullet was fired, false otherwise.
export function tryShootHealingBullet(clickPos = mousePos) {
	if (state.level < 3) return false;

	const medic = state.stations.find(s => s.isMedic && s.hp > 0);
	if (!medic || medic.isInCooldown) return false;
	const alive = state.stations.filter(s => s.hp > 0 && !s.isMedic);
	const target = alive.find(s => isOverlapping(clickPos, vec2(1, 1), s.pos, stationSize));
	if (!target) return false;

	medic.lastHealTime = time;
	const dir = target.pos.subtract(medic.pos).normalize(0.2);
	state.bullets.push({
		pos: medic.pos.copy(),
		vel: dir,
		healing: true,
	});
	return true;
}