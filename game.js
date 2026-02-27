// --- Globals ---
const worldSize = vec2(50, 38);
const stationSize = vec2(3, 2);
let snake = null;
let snakeDirs = [];
let	dir;
const walls = [];
let wallCount = 0;
let maxWalls = 3;
let moveTimer = 0;
const moveDelay = 0.012;
let gameOver = false;
let stations = [];
let invaders = [];
let lasers = [];
let spawnTimer = 0;
let totalSpawned = 0;
const maxInvaders = 600;
let killScore = 0;
let buildingPhase = false;
let justChangedDirFrom = null;
let mustSolidifyNextTick = false;
let gameWon = false;
let gamePaused = false;
// --- Sounds ---
const und = undefined;
const sWall = new Sound([0.1, und, 120, und, 0.05, 0.2, 2, 1, und, und, 80, 0.05]);
const sHit = new Sound([0.1, und, 300, und, 0.02, 0.1, 4, 2, und, und, 200, 0.02]);
const sLaser = new Sound([0.1, und, 537, 0.02, 0.02, 0.22, 1, 1.59, -6.98, 4.97]);

// --- Init ---
function gameInit() {
	// CanvasFixedSize = vec2(1280, 720);
	cameraPos = worldSize.scale(0.5);
	cameraScale = 23;

	startNewSnake();
	createStations();
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
					pos, hp: 10, maxHp: 10, vel: vec2(0, 0),
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
				pos, hp: 10, maxHp: 10, vel: vec2(0, 0),
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
	positionLogic(snake, snakeDirs, (pos, size, color, isCenter) => {
		newWall.push({
			pos, size, color, isCenter,
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
		gamePaused = true;
		return;
	}

	updateInvaders();
	updateLasers();

	if (mouseWasPressed(0)) {
		shootLaser();
	}

	if (killScore >= 200 && totalSpawned < maxInvaders) {
		buildingPhase = true;
		maxWalls++;
		setTimeout(() => {
			startNewSnake();
		}, 2500);
	}
}

function gameUpdate() {
	if (!gameOver && !gameWon && keyWasPressed('Escape')) {
		gamePaused = !gamePaused;
	}

	if (gamePaused) {
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
		gamePaused = true;
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

			// Use the centroid of overlapping isCenter pieces to determine push axis & sign.
			// This reliably resolves cases where a wall is built straight through the station,
			// since the diff from centroid -> station center points toward the larger open area.
			const centerPieces = overlapping.filter(p => p.isCenter);
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

				// Vector from wall-center centroid to station center
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

			// Find the deepest overlap to resolve this iteration, constrained to the
			// preferred axis/sign when available.
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
					// If colliding with another station, push it away from us as well.
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

			if (!bestMtv) {
				break;
			}

			const push = vec2(
				bestMtv.x + (bestMtv.x ? Math.sign(bestMtv.x) * bias : 0),
				bestMtv.y + (bestMtv.y ? Math.sign(bestMtv.y) * bias : 0),
			);
			s.pos = s.pos.add(push);

			// Reflect velocity along push axis if it opposes the push
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

			// Wall correction can push near/outside bounds
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
			if (l.pos.distance(inv.pos) < 0.5) {
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

	invaders.push({
		pos, size: vec2(1, 1), hp: 1, maxHp: 1, frame: 0, dir: vec2(0, 0),
	});
	totalSpawned++;
}

function updateInvaders() {
	for (const inv of invaders) {
		const aliveStations = stations.filter(s => s.hp > 0);
		if (!aliveStations.length) {
			return;
		}

		let nearest = aliveStations[0];
		let minDist = inv.pos.distance(nearest.pos);
		for (const s of aliveStations) {
			const d = inv.pos.distance(s.pos);
			if (d < minDist) {
				minDist = d;
				nearest = s;
			}
		}

		inv.targetPos ||= nearest.pos.copy();

		inv.targetPos = inv.targetPos.lerp(nearest.pos, 0.12);

		const dirTo = inv.targetPos.subtract(inv.pos).normalize(0.05);
		inv.pos = inv.pos.add(dirTo);
		inv.dir = dirTo;

		if (isOverlapping(inv.pos, inv.size, nearest.pos, stationSize)) {
			nearest.hp--;
			// Push station away from invader
			const pushDir = nearest.pos.subtract(inv.pos).normalize();
			nearest.vel = nearest.vel.add(pushDir.scale(1.05));
			inv.hp = 0;
			sHit.play();
		}

		const pointsCrashed = [];
		const collided = handleCollisionWithWalls(inv.pos, inv.size, pointsCrashed);
		if (collided) {
			killScore++;
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
		return true;
	}

	return false;
};

function moveSnake() {
	let head = snake[0].add(dir.scale(0.2));
	if (justChangedDirFrom) {
		if (dir.y === 1) {
			head = snake[0].add(dir.scale(1)).add(vec2(-0.8, 0));
			if (justChangedDirFrom.x === -1) {
				head = snake[0].add(vec2(0, 1));
			}
		}

		if (dir.x === -1) {
			head = snake[0].add(vec2(-0.20, -0.8));
			if (justChangedDirFrom.y === -1) {
				head = snake[0].add(vec2(-0.20, 0));
			}
		}

		if (dir.x === 1) {
			head = snake[0].add(dir.scale(1));
			if (justChangedDirFrom.y === 1) {
				head = snake[0].add(vec2(1, -0.8));
			}
		}

		if (dir.y === -1) {
			head = snake[0].add(vec2(-0.8, -0.20));
			if (justChangedDirFrom.x === -1) {
				head = snake[0].add(vec2(0, -0.20));
			}
		}

		justChangedDirFrom = null;
	}

	if (head.x < 0 || head.y < 0 || head.x >= worldSize.x || head.y >= worldSize.y) {
		mustSolidifyNextTick = true;
		return;
	}

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
	snake.pop();
	snakeDirs.pop();
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
			callback(newPos, size, color, j === 2);
		}
	}
};

// --- Render ---
function gameRender() {
	drawRect(cameraPos, worldSize, rgb(0.05, 0.05, 0.08));

	for (const s of stations) {
		const imgIndex = s.hp > 0 ? imgs.spaceStation.index : imgs.deadSpaceStation.index;
		drawTile(s.pos.add(vec2(0.5)), stationSize, tile(0, vec2(94, 60), imgIndex), WHITE);
	}

	for (const w of walls) {
		for (const p of w) {
			drawRect(p.pos, p.size, rgb(0.5, 0.5, 0.5));
		}
	}

	if (snake) {
		positionLogic(snake, snakeDirs, (pos, size, color) => {
			drawRect(pos, size, color);
		});
		// Draw for debugging
		// drawRect(snake[0].add(vec2(-4.4, 1)), vec2(20, 1.2), YELLOW);
	}

	const frame = Math.floor(Date.now() / 200) % 4;

	for (const inv of invaders) {
		// Rotate it 90 extra
		const angle = Math.atan2(-inv.dir.y, inv.dir.x) - (Math.PI / 2);
		inv.frameOffset ||= frame;
		if (!gamePaused) {
			inv.frame = (inv.frameOffset + frame) % 3;
		}
		// DrawRect(inv.pos, inv.size, rgb(1, 0.2, 0.2));

		drawTile(inv.pos, inv.size, tile(
			inv.frame,
			vec2(100, 100),
			imgs.invader.index,
		), WHITE, angle);
	}

	for (const l of lasers) {
		const angle = Math.atan2(-l.vel.y, l.vel.x);
		// DrawRect(l.pos, vec2(0.3, 0.3), rgb(1, 1, 0.3));
		drawTile(l.pos, vec2(0.3, 0.3), tile(0, vec2(24, 24), imgs.bullet.index), WHITE, angle);
	}

	for (const s of stations) {
		if (wallCount >= maxWalls || buildingPhase) {
			const barWidth = 3;
			const hpPercent = clamp(s.hp / s.maxHp, 0, 1);
			const barPos = s.pos.add(vec2(0.5, 2));
			drawRect(barPos, vec2(barWidth, 0.3), rgb(0.2, 0.2, 0.2));
			drawRect(barPos.add(vec2(-(barWidth * (1 - hpPercent)) / 2, 0)), vec2(barWidth * hpPercent, 0.3), rgb(0.2, 1, 0.2));
		}
	}
}

function gameRenderPost() {
	drawTextScreen('Walls: ' + wallCount + '/' + maxWalls, vec2(200, 40), 30);
	if (wallCount >= maxWalls || buildingPhase) {
		const enemiesLeft = (maxInvaders - totalSpawned) + invaders.length;
		drawTextScreen('INVASION!  Enemies left: ' + enemiesLeft, vec2(mainCanvasSize.x / 2, 60), 40);
		drawTextScreen('Kills for bonus: ' + killScore + '/200', vec2(mainCanvasSize.x / 2, 100), 30);
	}

	if (buildingPhase) {
		drawTextScreen('YOU EARNED AN EXTRA WALL!', vec2(mainCanvasSize.x / 2, (mainCanvasSize.y / 2) - 40), 60);
	}

	if (gameOver) {
		drawTextScreen('GAME OVER', mainCanvasSize.scale(0.5), 80);
	}

	if (gameWon) {
		drawTextScreen('YOU WIN!', mainCanvasSize.scale(0.5), 80);
	}
}

const imgs = {
	invader: {src: 'images/invader-90x90.png'},
	spaceStation: {src: 'images/space-station-94x60.png'},
	deadSpaceStation: {src: 'images/dead-space-station-94x60.png'},
	bullet: {src: 'images/bullet-24x24.png'},
};
const imagesSrcArray = [];
let index = 0;
for (const key of Object.keys(imgs)) {
	imagesSrcArray[index] = imgs[key].src;
	imgs[key].index = index;
	index++;
}

engineInit(gameInit, gameUpdate, 0, gameRender, gameRenderPost, imagesSrcArray);
