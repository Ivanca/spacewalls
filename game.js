import {
	vec2, rgb, WHITE, BLACK,
	rand, randInt, sign, clamp,
	isOverlapping, isIntersecting,
	timeDelta, time,
	getPaused, setPaused,
	cameraPos, setCameraPos, setCameraScale,
	keyDirection, keyWasPressed,
	mouseIsDown, mousePos,
	drawRect, drawTile, drawTextScreen,
	tile,
	mainCanvasSize, mainContext,
	Sound,
	engineInit,
} from './littlejs.esm.js';

// --- Globals ---
const worldSize = vec2(50, 38);
const stationSize = vec2(3, 2);
const extraWallScore = 120;
let snake = null;
let snakeDirs = [];
let	dir;
let walls = [];
let wallCount = 0;
let maxWalls = 3;
let moveTimer = 0;
const moveDelay = 0.012;
let gameOver = false;
let stations = [];
let invaders = [];
let explosions = [];
let lasers = [];
let lastLaserTime = -1;
let spawnTimer = 0;
let totalSpawned = 0;
const maxInvaders = 600;
let killScore = 0;
let buildingPhase = false;
let justChangedDirFrom = null;
let mustSolidifyNextTick = false;
let gameWon = false;
const gameTextFont = 'PressStart2P';
let introActive = true;
let tempTitleTimer = 0;
let tempTitle = '';
const introGoodLuckDuration = 2.2;
const introLines = [
	'Greetings General, first we enter the building stage',
	'to deploy 3 walls to protect our space stations,',
	'they will be attacked from all directions, but',
	'remember that they cant move but they can shot.',
	'',
	'PRESS SPACE TO START',
];
// --- Sounds ---
const und = undefined;
const sWall = new Sound([0.1, und, 120, und, 0.05, 0.2, 2, 1, und, und, 80, 0.05]);
const sHit = new Sound([0.1, und, 300, und, 0.02, 0.1, 4, 2, und, und, 200, 0.02]);
const sLaser = new Sound([0.1, und, 537, 0.02, 0.02, 0.22, 1, 1.59, -6.98, 4.97]);
const sStationHit = new Sound([und, und, 333, 0.01, 0, 0.9, 4, 1.9, und, und, und, und, und, 0.5, und, 0.6]);
const sWallHit = new Sound([0.1, und, 333, 0.01, 0, 0.9, 4, 1.9, und, und, und, und, und, 0.5, und, 0.6]);

// --- Init ---
function gameInit() {
	// CanvasFixedSize = vec2(1280, 720);
	setCameraPos(worldSize.scale(0.5));
	setCameraScale(23);

	resetGame();
}

function resetGame() {
	snake = null;
	snakeDirs = [];
	dir = vec2(1, 0);
	walls = [];
	wallCount = 0;
	maxWalls = 3;
	moveTimer = 0;
	gameOver = false;
	stations = [];
	invaders = [];
	lasers = [];
	explosions = [];
	spawnTimer = 0;
	totalSpawned = 0;
	killScore = 0;
	buildingPhase = false;
	justChangedDirFrom = null;
	mustSolidifyNextTick = false;
	gameWon = false;
	introActive = true;
	tempTitleTimer = 0;

	startNewSnake();
	createStations();
	setPaused(true);
}

function findFarthestPoint(listA, listB) {
	let farthestPoint = null;
	let maxMinDistance = -Infinity;

	for (const pointA of listA) {
		// Find closest point in listB
		let minDistance = Infinity;

		for (const pointB of listB) {
			const d = pointA.distance(pointB);
			if (d < minDistance) {
				minDistance = d;
			}
		}

		// Keep the point with largest minimum distance
		if (minDistance > maxMinDistance) {
			maxMinDistance = minDistance;
			farthestPoint = pointA;
		}
	}

	return farthestPoint;
}

function startNewSnake() {
	if (wallCount >= maxWalls) {
		snake = null;
		return;
	}

	snake = [];
	const validStartPositions = [
		vec2(18, 17),
		vec2(22, 3),
		vec2(22, 26),
		vec2(22, 6),
		vec2(22, 23),
		vec2(22, 9),
		vec2(22, 20),
		vec2(18, 11),
		vec2(18, 14),
		vec2(14, 6),
		vec2(14, 23),
		vec2(14, 9),
		vec2(14, 20),
	];
	let start = validStartPositions[4];

	// Find the position farthest away from one of the valid
	const allWallPointsPos = walls.flat().map(p => p.pos);
	if (allWallPointsPos.length) {
		start = findFarthestPoint(validStartPositions, allWallPointsPos);
	}

	dir = vec2(1, 0);
	snakeDirs = [];
	for (let i = 0; i < 90; i++) {
		snake.push(start.subtract(vec2(i * 2, 0).scale(0.1)));
		snakeDirs.push(dir.copy());
	}
}

function createStations() {
	const center = worldSize.scale(0.5);
	const stationCount = 5;
	const minDistance = 7;
	const maxDistance = 11;
	const minDistanceBetweenStations = 5;

	stations = [];
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
			for (const s of stations) {
				if (pos.distance(s.pos) < minDistanceBetweenStations) {
					tooClose = true;
					break;
				}
			}

			if (!tooClose) {
				stations.push({
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
			stations.push({
				pos, hp: 10, maxHp: 10, vel: vec2(0, 0), lastHitTime: -Infinity,
			});
		}
	}
}

// --- Update ---

function updateSnakeMovement() {
	const input = keyDirection();
	if (input.x && !dir.x) {
		justChangedDirFrom = dir.copy();
		dir = vec2(sign(input.x), 0);
	} else if (input.y && !dir.y) {
		justChangedDirFrom = dir.copy();
		dir = vec2(0, sign(input.y));
	}
}

function solidifyWall() {
	const newWall = [];
	positionLogic(snake, snakeDirs, ({pos, size, color, tile, isMiddle}) => {
		newWall.push({
			pos, size, color, tile, isMiddle,
		});
	});
	walls.push(newWall);
	wallCount++;
	sWall.play();
	startNewSnake();
	mustSolidifyNextTick = false;
	if (buildingPhase) {
		buildingPhase = false;
		killScore = 0;
	}
}

function updateInvasionPhase() {
	if (totalSpawned < maxInvaders) {
		spawnTimer -= timeDelta;
		if (spawnTimer <= 0) {
			spawnTimer = 0.15;
			spawnInvader();
		}
	}

	if (totalSpawned >= maxInvaders && invaders.length === 0 && stations.some(s => s.hp > 0)) {
		gameWon = true;
		setPaused(true);
		return;
	}

	updateInvaders();
	updateLasers();

	if (mouseIsDown(0)) {
		shootLaser();
	}

	if (killScore >= extraWallScore && totalSpawned < maxInvaders) {
		buildingPhase = true;
		tempTitleTimer = 3;
		tempTitle = 'YOU EARNED ANOTHER WALL!\nPLACE IT WISELY';
		maxWalls++;
		setTimeout(() => {
			startNewSnake();
		}, 2500);
	}
}

function gameUpdatePost() {
	if (introActive) {
		if (keyWasPressed('Space')) {
			introActive = false;
			tempTitleTimer = introGoodLuckDuration;
			tempTitle = 'GOOD LUCK!';
			setPaused(false);
		}

		return;
	}

	if (gameOver && keyWasPressed('Space')) {
		resetGame();
		return;
	}

	if (!gameOver && !gameWon && keyWasPressed('Escape')) {
		setPaused(!getPaused());
	}

	if (getPaused() && keyWasPressed('Space') && !gameOver && !gameWon) {
		setPaused(false);
	}

	if (tempTitleTimer > 0) {
		tempTitleTimer = Math.max(0, tempTitleTimer - timeDelta);
	}
}

function gameUpdate() {
	if (getPaused()) {
		return;
	}

	if (snake) {
		updateSnakeMovement();

		if ((keyWasPressed('Space') || mustSolidifyNextTick) && wallCount < maxWalls) {
			solidifyWall();
		}

		moveTimer -= timeDelta;
		if (moveTimer <= 0 && snake) {
			moveTimer = moveDelay;
			moveSnake();
		}
	}

	if (wallCount >= maxWalls) {
		updateInvasionPhase();
	}

	updateStations();

	if (stations.every(s => s.hp <= 0)) {
		gameOver = true;
		setPaused(true);
	}
}

function updateStations() {
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
				const otherStation = stations.find(st => st.pos === p.pos);
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
		const otherStations = stations.filter(st => st !== s && st.hp > 0).map(st => ({pos: st.pos, size: stationSize}));
		const wallPieces = walls.flat();
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

	for (const s of stations) {
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

function hasClearShot(stationPos, target) {
	const start = stationPos.add(vec2(0.5, 0.5));
	for (const w of walls) {
		for (const p of w) {
			if (isIntersecting(start, target, p.pos, p.size)) {
				return false;
			}
		}
	}

	return true;
}

function shootLaser() {
	if (time - lastLaserTime < 0.1) {
		return;
	}

	const alive = stations.filter(s => s.hp > 0);
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
	lasers.push({pos: best.pos.add(vec2(0.5, 0.5)), vel: dirToMouse});
	sLaser.play(best.pos);
	lastLaserTime = time;
}

function updateLasers() {
	for (const l of lasers) {
		l.pos = l.pos.add(l.vel);

		// Collide with walls
		const hit = handleCollisionWithWalls(l.pos, vec2(0.3, 0.3));
		if (hit) {
			l.hit = true;
			sWall.play(l.pos);
		}

		// Collide with invaders
		for (const inv of invaders) {
			if (isOverlapping(l.pos, vec2(0.3, 0.3), inv.pos, inv.size)) {
				const wasAlive = inv.hp > 0;
				inv.hp -= 2;
				if (wasAlive && inv.hp <= 0) {
					killScore++;
				}

				l.hit = true;
				sHit.play(inv.pos);
			}
		}
	}

	lasers = lasers.filter(({hit, pos}) => {
		const {x, y} = pos;
		if (hit) {
			return false;
		}

		return x > -2 && x < worldSize.x + 2 && y > -2 && y < worldSize.y + 2;
	});
	invaders = invaders.filter(i => i.hp > 0);
}

function spawnInvader() {
	const side = randInt(0, 4);
	let pos;

	if (side === 0) {
		pos = vec2(randInt(0, worldSize.x), worldSize.y);
	}

	if (side === 1) {
		pos = vec2(randInt(0, worldSize.x), 0);
	}

	if (side === 2) {
		pos = vec2(0, randInt(0, worldSize.y));
	}

	if (side === 3) {
		pos = vec2(worldSize.x, randInt(0, worldSize.y));
	}

	const spawnAlive = stations.filter(s => s.hp > 0);
	const isRandomTarget = Math.random() < 0.1;
	const targetStation = isRandomTarget && spawnAlive.length
		? spawnAlive[randInt(0, spawnAlive.length)]
		: null;

	invaders.push({
		pos, size: vec2(1, 1), hp: 1, maxHp: 1, frame: 0, dir: vec2(0, 0),
		randomTarget: isRandomTarget, targetStation,
	});
	totalSpawned++;
}

function updateInvaders() {
	for (const inv of invaders) {
		const aliveStations = stations.filter(s => s.hp > 0);
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
		inv.pos = inv.pos.add(dirTo);
		inv.dir = dirTo;

		if (isOverlapping(inv.pos, inv.size, nearest.pos, stationSize)) {
			nearest.hp--;
			nearest.lastHitTime = time;
			// Push station away from invader
			const pushDir = nearest.pos.subtract(inv.pos).normalize();
			nearest.vel = nearest.vel.add(pushDir.scale(1.05));
			inv.hp = 0;
			explosions.push({
				pos: inv.pos.add(inv.dir.scale(10)), frame: 0, start: Date.now(),
			});
			sStationHit.play();
		}

		const pointsCrashed = [];
		const collided = handleCollisionWithWalls(inv.pos, inv.size, pointsCrashed);
		if (collided) {
			inv.hp = 0;
		}
	}
}

const handleCollisionWithWalls = (pos, size) => {
	const pointsCrashed = [];
	for (const w of walls) {
		const index = walls.indexOf(w);
		for (const p of w) {
			if (isOverlapping(pos, size, p.pos, p.size)) {
				pointsCrashed.push({index, p});
			}
		}
	}

	for (const sc of pointsCrashed) {
		const {index} = sc;
		walls[index] = walls[index].filter(p => p !== sc.p);
	}

	if (pointsCrashed.length) {
		sWallHit.play();
		explosions.push({
			pos: pos.copy(), frame: 0, start: Date.now(),
		});
		return true;
	}

	return false;
};

// Returns the offset to add to snake[0] when turning a corner from fromDir into newDir.
// These offsets are chosen so the 5-tile perpendicular fans fill the corner square exactly.
function getCornerOffset(newDir, fromDir) {
	if (newDir.y === 1) {
		if (fromDir.x === -1) {
			return vec2(0, 1);
		}

		return vec2(-0.8, 1);
	}

	if (newDir.x === -1) {
		if (fromDir.y === -1) {
			return vec2(-0.2, 0);
		}

		return vec2(-0.2, -0.8);
	}

	if (newDir.x === 1) {
		if (fromDir.y === 1) {
			return vec2(1, -0.8);
		}

		return vec2(1, 0);
	}

	if (newDir.y === -1) {
		if (fromDir.x === -1) {
			return vec2(0, -0.2);
		}

		return vec2(-0.8, -0.2);
	}

	return newDir.scale(0.2);
}

function moveSnake() {
	let head = snake[0].add(dir.scale(0.2));
	if (justChangedDirFrom) {
		head = snake[0].add(getCornerOffset(dir, justChangedDirFrom));
		justChangedDirFrom = null;
	}

	head.x = ((head.x % worldSize.x) + worldSize.x) % worldSize.x;
	head.y = ((head.y % worldSize.y) + worldSize.y) % worldSize.y;

	// For (const s of snake) {
	// 	if (s.x === head.x && s.y === head.y) {
	// 		mustSolidifyNextTick = true;
	// 		return;
	// 	}
	// }

	// positionLogic(snake, snakeDirs, (pos, size) => {
	// 	for (const w of walls) {
	// 		for (const p of w) {
	// 			if (isOverlapping(pos, size, p.pos, p.size)) {
	// 				mustSolidifyNextTick = true;
	// 			}
	// 		}
	// 	}
	// });

	snake.unshift(head);
	snakeDirs.unshift(dir.copy());

	// Capture the direction of the tail segment about to be removed
	const poppedDir = snakeDirs[snakeDirs.length - 1].copy();
	snake.pop();
	snakeDirs.pop();

	// Fix corner tail disappearance order:
	// Find the last ≤5 segments that still have poppedDir.
	// If there is a direction change just before them (a corner), rotate both
	// their snakeDirs entry and their position 90° around the transition point
	// so they render on the correct side as the tail unwinds.
	if (snakeDirs.length > 0) {
		const tailIdx = snakeDirs.length - 1;
		let transitionIdx = -1;
		for (let i = tailIdx; i >= Math.max(0, tailIdx - 4); i--) {
			const d = snakeDirs[i];
			if (d.x !== poppedDir.x || d.y !== poppedDir.y) {
				transitionIdx = i;
				break;
			}
		}

		if (transitionIdx >= 0) {
			const nextDir = snakeDirs[transitionIdx];
			// The first poppedDir segment (transitionIdx+1) sits right at the corner base from
			// the old direction. Applying the same offset that getCornerOffset uses for the head
			// gives us the reference point in new-direction space. From there we walk backwards
			// in nextDir steps of 0.2 to place each remaining tail segment.
			const offset = getCornerOffset(nextDir, poppedDir);
			const cornerBase = snake[transitionIdx + 1].add(offset);
			for (let i = transitionIdx + 1; i <= tailIdx; i++) {
				snakeDirs[i] = nextDir.copy();
				const steps = i - (transitionIdx + 1);
				snake[i] = cornerBase.subtract(nextDir.scale(0.2 * steps));
			}
		}
	}
}

const positionLogic = (snakePos, snakeDir, callback) => {
	for (let i = 0; i < snakePos.length; i++) {
		const pos = snakePos[i];
		const dir = snakeDir[i];
		for (let j = 0; j < 5; j++) {
			const color = WHITE;
			const size = vec2(0.2);
			const extra
				= dir.y === 1
					? vec2(j * 0.2, 0)
					: dir.y === -1
						? vec2(j * 0.2, 0)
						: dir.x === 1
							? vec2(0, j * 0.2)
							: vec2(0, j * 0.2);
			const newPos = pos.add(vec2(0.5)).add(extra);
			const n = snakePos.length;
			let row;
			if (i === 0) {
				row = 0;
			} else if (i === 1) {
				row = 1;
			} else if (i === n - 1) {
				row = 12;
			} else if (i === n - 2) {
				row = 11;
			} else {
				row = 2 + ((i - 2) % 10);
			}

			const newTile = tile((row * 5) + j, vec2(16, 16), imgs.wall);
			callback({
				pos: newPos, size, color, tile: newTile, isMiddle: j === 2,
			});
		}
	}
};

// --- Render ---
function gameRender() {
	drawRect(cameraPos, worldSize, rgb(0.05, 0.05, 0.08));

	for (const s of stations) {
		const imgIndex = s.hp > 0 ? imgs.spaceStation : imgs.deadSpaceStation;
		const hitElapsed = time - (s.lastHitTime ?? -Infinity);
		const blinkRed = s.hp > 0 && hitElapsed < 0.5 && Math.floor(hitElapsed / 0.1) % 2 === 0;
		const stationColor = blinkRed ? rgb(1, 0.1, 0.1) : WHITE;
		drawTile(s.pos, stationSize, tile(0, vec2(94, 60), imgIndex), stationColor);
		// drawRect(s.pos, stationSize, rgb(0.2, 0.8, 1));
	}

	for (const w of walls) {
		for (const p of w) {
			// drawRect(p.pos, p.size, rgb(0.5, 0.5, 0.5));
			drawTile(p.pos, p.size, p.tile, p.color);
		}
	}

	for (const e of explosions) {
		const frame = Math.floor((Date.now() - e.start) / 100) % 4;
		drawTile(e.pos, vec2(1), tile(frame, vec2(18, 18), imgs.explosion), rgb(1, 0.6, 0.2));
		e.frame++;
		if (e.frame > 3) {
			explosions = explosions.filter(ex => ex !== e);
		}
	}

	if (snake) {
		positionLogic(snake, snakeDirs, ({pos, size, color, _, __}) => {
			drawRect(pos, size, color);
		});
		// Draw for debugging
		// drawRect(snake[0].add(vec2(-4.4, 1)), vec2(20, 1.2), YELLOW);
	}

	const invFrame = Math.floor(Date.now() / 200) % 4;

	for (const inv of invaders) {
		// Rotate it 90 extra
		const angle = Math.atan2(-inv.dir.y, inv.dir.x) - (Math.PI / 2);
		inv.frameOffset ||= invFrame;
		if (!getPaused()) {
			inv.frame = (inv.frameOffset + invFrame) % 3;
		}

		// drawRect(inv.pos, inv.size, rgb(1, 0.2, 0.2));

		drawTile(inv.pos, inv.size, tile(
			inv.frame,
			vec2(42, 42),
			imgs.invader,
		), WHITE, angle);
	}

	for (const l of lasers) {
		const angle = Math.atan2(-l.vel.y, l.vel.x);
		// DrawRect(l.pos, vec2(0.3, 0.3), rgb(1, 1, 0.3));
		drawTile(l.pos, vec2(0.3, 0.3), tile(0, vec2(24, 24), imgs.bullet), WHITE, angle);
	}

	for (const s of stations) {
		if ((wallCount >= maxWalls || buildingPhase) && s.hp > 0) {
			const barWidth = 3;
			const hpPercent = clamp(s.hp / s.maxHp, 0, 1);
			const barPos = s.pos.add(vec2(0.5, 2));
			drawRect(barPos, vec2(barWidth, 0.3), rgb(0.2, 0.2, 0.2));
			drawRect(barPos.add(vec2(-(barWidth * (1 - hpPercent)) / 2, 0)), vec2(barWidth * hpPercent, 0.3), rgb(0.2, 1, 0.2));
		}
	}
}

function gameRenderPost() {
	if (introActive) {
		drawRect(mainCanvasSize.scale(0.5), mainCanvasSize, rgb(0, 0, 0, 0.78));
		const centerX = mainCanvasSize.x / 2;
		const centerY = mainCanvasSize.y / 2;
		const lineHeight = 34;
		const startY = centerY - (((introLines.length - 1) * lineHeight) / 2);

		for (let i = 0; i < introLines.length; i++) {
			drawTextScreen(
				introLines[i],
				vec2(centerX, startY + (i * lineHeight)),
				26,
				WHITE,
				0,
				BLACK,
				'center',
				gameTextFont,
			);
		}

		return;
	}

	// drawTextScreen('Walls: ' + wallCount + '/' + maxWalls, vec2(200, 40), 30, WHITE, 0, BLACK, 'center', gameTextFont);

	if (tempTitleTimer > 0) {
		drawTextScreen(tempTitle, vec2(mainCanvasSize.x / 2, 180), 52, WHITE, 0, BLACK, 'center', gameTextFont);
	}

	if (wallCount >= maxWalls || buildingPhase) {
		const enemiesLeft = (maxInvaders - totalSpawned) + invaders.length;
		drawTextScreen('Enemies left: ' + enemiesLeft, vec2(mainCanvasSize.x / 2, 60), 20, WHITE, 0, BLACK, 'center', gameTextFont);

		// Glowing cyan power bar
		{
			const ctx = mainContext;
			const barW = 320;
			const barH = 18;
			const barX = (mainCanvasSize.x / 2) - (barW / 2);
			const barY = 88;
			const fill = clamp(killScore / extraWallScore, 0, 1);

			ctx.save();
			ctx.setTransform(1, 0, 0, 1, 0, 0);

			// Dark background
			ctx.fillStyle = 'rgba(4, 14, 24, 0.88)';
			ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

			// Filled glow portion
			if (fill > 0) {
				// Outer soft glow
				ctx.shadowBlur = 18;
				ctx.shadowColor = '#00e8ff';
				ctx.fillStyle = fill >= 1 ? '#aaf8ff' : '#00d4f5';
				ctx.fillRect(barX, barY, barW * fill, barH);
				// Inner bright core
				ctx.shadowBlur = 6;
				ctx.shadowColor = '#ffffff';
				ctx.fillStyle = fill >= 1 ? '#ffffff' : 'rgba(160,245,255,0.55)';
				ctx.fillRect(barX, barY + (barH * 0.2), barW * fill, barH * 0.35);
				ctx.shadowBlur = 0;
			}

			// Border
			ctx.strokeStyle = 'rgba(0, 195, 225, 0.75)';
			ctx.lineWidth = 1.5;
			ctx.strokeRect(barX, barY, barW, barH);

			// Label
			ctx.font = 'bold 13px monospace';
			ctx.textAlign = 'center';
			ctx.fillStyle = 'rgba(140, 235, 255, 0.9)';
			ctx.fillText('ENEMIES SHOT BONUS METER', mainCanvasSize.x / 2, barY - 4);

			ctx.restore();
		}
	}

	if (gameOver) {
		drawTextScreen('GAME OVER', mainCanvasSize.scale(0.5), 80, WHITE, 0, BLACK, 'center', gameTextFont);
		drawTextScreen('PRESS SPACE TO RESTART', vec2(mainCanvasSize.x / 2, (mainCanvasSize.y / 2) + 60), 24, WHITE, 0, BLACK, 'center', gameTextFont);
	}

	if (gameWon) {
		drawTextScreen('YOU WIN!', mainCanvasSize.scale(0.5), 80, WHITE, 0, BLACK, 'center', gameTextFont);
	}
}

const imgs = {
	invader: 'images/invader2-42x42.png',
	spaceStation: 'images/space-station-94x60.png',
	deadSpaceStation: 'images/dead-space-station-94x60.png',
	explosion: 'images/explosion-18x18.png',
	bullet: 'images/bullet-24x24.png',
	wall: 'images/wall-16x16.png',
	/* wall is a grid of 5 * 13 tiles, the top-left corner tile is at (0, 0), the top-right corner tile is at (4, 0),
	the bottom-left corner tile is at (0, 12), and the bottom-right corner tile is at (4, 12)
	the top 2 rows must be used in order (are continuations of the corners), as well as the 2 bottom rows (are continuations of the corners),
	the rows from 2 to 11 must be repeated for filler, the column order must be respected in all
	*/
};
const imagesSrcArray = [];
let index = 0;
for (const key of Object.keys(imgs)) {
	imagesSrcArray[index] = imgs[key];
	imgs[key] = index;
	index++;
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, imagesSrcArray);
