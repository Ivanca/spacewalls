import {
	vec2, rand, isOverlapping, isIntersecting, timeDelta
} from '../littlejs.esm.js';
import {state} from './state.js';
import {worldSize, stationSize} from './constants.js';
import {sHit} from './sounds.js';

export function createStations() {
	const center = worldSize.scale(0.5);
	const stationCount = 5;
	const minDistance = 7;
	const maxDistance = 11;
	const minDistanceBetweenStations = 5;

	state.stations = [];
	const maxAttempts = 1000;

	for (let i = 0; i < stationCount; i++) {
		let placed = false;
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const angle = rand(0, Math.PI * 2);
			const distance = rand(minDistance, maxDistance);
			const offset = vec2(Math.cos(angle) * distance, Math.sin(angle) * distance);
			const pos = center.add(offset);

			// Ensure within world bounds
			if (pos.x < 1 || pos.x > worldSize.x - 1 || pos.y < 1 || pos.y > worldSize.y - 1) {
				continue;
			}

			// Ensure minimum distance from other stations
			let tooClose = false;
			for (const s of state.stations) {
				if (pos.distance(s.pos) < minDistanceBetweenStations) {
					tooClose = true;
					break;
				}
			}

			if (!tooClose) {
				state.stations.push({
					pos, hp: 10, maxHp: 10, vel: vec2(0, 0), lastHitTime: -Infinity,
				});
				placed = true;
				break;
			}
		}

		if (!placed) {
			// Fallback: place at a random angle with minDistance
			const angle = rand(0, Math.PI * 2);
			const pos = center.add(vec2(Math.cos(angle) * minDistance, Math.sin(angle) * minDistance));
			state.stations.push({
				pos, hp: 10, maxHp: 10, vel: vec2(0, 0), lastHitTime: -Infinity,
			});
		}
	}
}

export function hasClearShot(stationPos, target) {
	const start = stationPos;
	for (const w of state.walls) {
		for (const p of w) {
			if (isIntersecting(start, target, p.pos, p.size)) {
				return false;
			}
		}
	}

	return true;
}

export function updateStations() {
	const damping = 0.93 ** (timeDelta * 60);
	const restitution = 0.85;
	const stopEpsilon = 0.001;

	const halfW = stationSize.x / 2;
	const halfH = stationSize.y / 2;

	// Smaller than wall tile size (snake wall tiles are 0.2)
	const maxMovePerStep = 0.08;
	const maxWallSolveIterations = 10;
	const bias = 0.0005;

	const resolveWorldBounds = s => {
		const center = s.pos.add(vec2(0.5, 0.5));

		if (center.x - halfW < 0) {
			center.x = halfW;
			s.pos.x = center.x - 0.5;
			if (s.vel.x < 0) {
				s.vel.x = -s.vel.x * restitution;
			}
		} else if (center.x + halfW > worldSize.x) {
			center.x = worldSize.x - halfW;
			s.pos.x = center.x - 0.5;
			if (s.vel.x > 0) {
				s.vel.x = -s.vel.x * restitution;
			}
		}

		if (center.y - halfH < 0) {
			center.y = halfH;
			s.pos.y = center.y - 0.5;
			if (s.vel.y < 0) {
				s.vel.y = -s.vel.y * restitution;
			}
		} else if (center.y + halfH > worldSize.y) {
			center.y = worldSize.y - halfH;
			s.pos.y = center.y - 0.5;
			if (s.vel.y > 0) {
				s.vel.y = -s.vel.y * restitution;
			}
		}
	};

	const getPreferredAxis = (centerPieces, center) => {
		let preferredAxis = null;
		let preferredSign = 0;

		if (centerPieces.length > 0) {
			let cx = 0;
			let cy = 0;
			for (const p of centerPieces) {
				cx += p.pos.x;
				cy += p.pos.y;
			}

			cx /= centerPieces.length;
			cy /= centerPieces.length;

			const diffX = center.x - cx;
			const diffY = center.y - cy;

			if (Math.abs(diffX) >= Math.abs(diffY)) {
				preferredAxis = 'x';
				preferredSign = Math.sign(diffX) || 1;
			} else {
				preferredAxis = 'y';
				preferredSign = Math.sign(diffY) || 1;
			}
		}

		return {preferredAxis, preferredSign};
	};

	const findBestMtv = ({overlapping, center, preferredAxis, preferredSign, otherStations}) => {
		let bestMtv = null;
		let bestDepth = -Infinity;

		for (const p of overlapping) {
			const dx = center.x - p.pos.x;
			const dy = center.y - p.pos.y;
			const overlapX = (halfW + (p.size.x / 2)) - Math.abs(dx);
			const overlapY = (halfH + (p.size.y / 2)) - Math.abs(dy);

			if (overlapX <= 0 || overlapY <= 0) {
				continue;
			}

			if (otherStations.includes(p)) {
				const otherStation = state.stations.find(st => st.pos === p.pos);
				const pushDir = p.pos.subtract(center).normalize();
				otherStation.vel = otherStation.vel.add(pushDir.scale(1.05));
				sHit.play(otherStation.pos);
			}

			let mtv;
			let depth;

			if (preferredAxis === 'x') {
				mtv = vec2(preferredSign * overlapX, 0);
				depth = overlapX;
			} else if (preferredAxis === 'y') {
				mtv = vec2(0, preferredSign * overlapY);
				depth = overlapY;
			} else if (overlapX < overlapY) {
				const sx = dx >= 0 ? 1 : -1;
				mtv = vec2(sx * overlapX, 0);
				depth = overlapX;
			} else {
				const sy = dy >= 0 ? 1 : -1;
				mtv = vec2(0, sy * overlapY);
				depth = overlapY;
			}

			if (depth > bestDepth) {
				bestDepth = depth;
				bestMtv = mtv;
			}
		}

		return bestMtv;
	};

	const resolveWallsIterative = s => {
		const otherStations = state.stations.filter(st => st !== s && st.hp > 0).map(st => ({pos: st.pos, size: stationSize}));
		const wallPieces = state.walls.flat();
		const validObstacles = [...wallPieces, ...otherStations];

		for (let iter = 0; iter < maxWallSolveIterations; iter++) {
			const center = s.pos.add(vec2(0.5, 0.5));

			const overlapping = validObstacles.filter(p => isOverlapping(center, stationSize, p.pos, p.size));
			if (!overlapping.length) {
				break;
			}

			const centerPieces = overlapping.filter(p => p.isMiddle);
			const {preferredAxis, preferredSign} = getPreferredAxis(centerPieces, center);

			const bestMtv = findBestMtv({
				overlapping, center, preferredAxis, preferredSign, otherStations,
			});

			if (!bestMtv) {
				break;
			}

			const push = vec2(
				bestMtv.x + (bestMtv.x ? Math.sign(bestMtv.x) * bias : 0),
				bestMtv.y + (bestMtv.y ? Math.sign(bestMtv.y) * bias : 0),
			);
			s.pos = s.pos.add(push);

			if (bestMtv.x) {
				const nx = Math.sign(bestMtv.x);
				if (s.vel.x * nx < 0) {
					s.vel.x = -s.vel.x * restitution;
				}
			} else if (bestMtv.y) {
				const ny = Math.sign(bestMtv.y);
				if (s.vel.y * ny < 0) {
					s.vel.y = -s.vel.y * restitution;
				}
			}

			resolveWorldBounds(s);
		}
	};

	for (const s of state.stations) {
		// Always run a resolution pass so stations embedded by a freshly placed
		// wall (zero velocity) are immediately pushed out in the right direction.
		resolveWallsIterative(s);
		resolveWorldBounds(s);

		if (s.vel.length() < stopEpsilon) {
			s.vel = vec2(0, 0);
			continue;
		}

		const speed = s.vel.length();
		const totalMove = speed * timeDelta;
		const steps = Math.max(1, Math.ceil(totalMove / maxMovePerStep));
		const subDt = timeDelta / steps;

		for (let i = 0; i < steps; i++) {
			s.pos = s.pos.add(s.vel.scale(subDt));
			resolveWorldBounds(s);
			resolveWallsIterative(s);
		}

		s.vel = s.vel.scale(damping);
		if (s.vel.length() < stopEpsilon) {
			s.vel = vec2(0, 0);
		}
	}
}
