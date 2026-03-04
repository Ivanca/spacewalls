import {
	vec2, randInt, isOverlapping, time, timeDelta,
} from '../littlejs.esm.min.js';
import {state} from './state.js';
import {worldSize, stationSize, blackHoleRadius} from './constants.js';
import {sStationHit} from './sounds.js';
import {handleCollisionWithWalls} from './walls.js';
import {hasClearShot} from './stations.js';

export function spawnInvader() {
	let pos;
	const spawnFromBlackHole = state.blackHoles.length > 0 && Math.random() < 0.3333;

	if (spawnFromBlackHole) {
		const bh = state.blackHoles[Math.floor(Math.random() * state.blackHoles.length)];
		const angle = Math.random() * Math.PI * 2;
		pos = vec2(
			bh.pos.x + (Math.cos(angle) * blackHoleRadius),
			bh.pos.y + (Math.sin(angle) * blackHoleRadius),
		);
	} else {
		// Pick a random point along the full perimeter so that longer sides
		// (e.g. top/bottom on a wide screen) receive proportionally more spawns.
		const W = worldSize.x;
		const H = worldSize.y;
		const perimeter = 2 * W + 2 * H;
		const r = Math.random() * perimeter;

		if (r < W) {
			// top
			pos = vec2(r, H);
		} else if (r < 2 * W) {
			// bottom
			pos = vec2(r - W, 0);
		} else if (r < 2 * W + H) {
			// left
			pos = vec2(0, r - 2 * W);
		} else {
			// right
			pos = vec2(W, r - 2 * W - H);
		}
	}

	const spawnAlive = state.stations.filter(s => s.hp > 0);
	const isRandomTarget = Math.random() < 0.1;
	const targetStation = isRandomTarget && spawnAlive.length
		? spawnAlive[randInt(0, spawnAlive.length)]
		: null;

	state.invaders.push({
		pos, size: vec2(1, 1), hp: 1, maxHp: 1, frame: 0, dir: vec2(0, 0),
		randomTarget: isRandomTarget, targetStation,
	});
	state.totalSpawned++;
}

export function updateInvaders() {
	state.invaders = state.invaders.filter(i => i.hp > 0);
	for (const inv of state.invaders) {
		const aliveStations = state.stations.filter(s => s.hp > 0);
		if (!aliveStations.length) {
			return;
		}

		let nearest;
		if (inv.randomTarget) {
			if (!inv.targetStation || inv.targetStation.hp <= 0) {
				inv.targetStation = aliveStations[randInt(0, aliveStations.length)];
			}

			nearest = inv.targetStation;
		} else {
			nearest = aliveStations[0];
			let minDist = inv.pos.distance(nearest.pos);
			for (const s of aliveStations) {
				const d = inv.pos.distance(s.pos);
				if (d < minDist) {
					minDist = d;
					nearest = s;
				}
			}
		}

		inv.targetPos ||= nearest.pos.copy();

		inv.targetPos = inv.targetPos.lerp(nearest.pos, 0.12);

		const dirTo = inv.targetPos.subtract(inv.pos).normalize(0.05);
		const prevPos = inv.pos.copy();
		inv.pos = inv.pos.add(dirTo);
		inv.dir = dirTo;

		const collided = handleCollisionWithWalls(inv.pos, inv.size, prevPos, 2);
		if (collided) {
			inv.hp = 0;
			return;
		}
		// check collision agains all stations:
		for (const s of aliveStations) {
			if (isOverlapping(inv.pos, inv.size, s.pos, stationSize)) {
				s.hp--;
				s.lastHitTime = time;
				// Push station away from invader
				const pushDir = s.pos.subtract(inv.pos).normalize();
				s.vel = s.vel.add(pushDir.scale(1.05));
				inv.hp = 0;
				state.explosions.push({
					pos: inv.pos.add(inv.dir.scale(10)), frame: 0, start: Date.now(),
				});
				sStationHit.play();
				break;
			}
		}
	}
}

