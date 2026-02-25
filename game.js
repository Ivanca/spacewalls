// --- Globals ---
const worldSize = vec2(50, 38);
let snake = null;
let snakeDirs = [];
let	dir;
const walls = [];
let wallCount = 0;
const maxWalls = 3;
let moveTimer = 0;
const moveDelay = 0.012;
let gameOver = false;
let stations = [];
let invaders = [];
let lasers = [];
let spawnTimer = 0;
let totalSpawned = 0;
const maxInvaders = 600;
let justChangedDirFrom = null;
let mustSolidifyNextTick = false;
let gameWon = false;
// --- Sounds ---
const und = undefined;
const sWall = new Sound([und, und, 120, und, 0.05, 0.2, 2, 1, und, und, 80, 0.05]);
const sHit = new Sound([und, und, 300, und, 0.02, 0.1, 4, 2, und, und, 200, 0.02]);
const sLaser = new Sound([und, und, 700, und, 0.01, 0.05, 2, 2, und, und, 500, 0.01]);

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
				stations.push({pos, hp: 10, maxHp: 10});
				placed = true;
				break;
			}
		}

		if (!placed) {
			// Fallback: place at a random angle with minDistance
			const angle = rand(0, Math.PI * 2);
			const pos = center.add(vec2(Math.cos(angle) * minDistance, Math.sin(angle) * minDistance));
			stations.push({pos, hp: 10, maxHp: 10});
		}
	}
}

// --- Update ---
function gameUpdate() {
	if (gameOver || gameWon) {
		return;
	}

	if (snake) {
		const input = keyDirection();
		if (input.x && !dir.x) {
			justChangedDirFrom = dir.copy();
			dir = vec2(sign(input.x), 0);
		}

		if (input.y && !dir.y) {
			justChangedDirFrom = dir.copy();
			dir = vec2(0, sign(input.y));
		}

		if ((keyWasPressed('Space') || mustSolidifyNextTick) && wallCount < maxWalls) {
			const newWall = [];
			positionLogic(snake, snakeDirs, (pos, size, color) => {
				newWall.push({pos, size, color});
			});
			walls.push(newWall);
			wallCount++;
			sWall.play();
			startNewSnake();
			mustSolidifyNextTick = false;
		}

		moveTimer -= timeDelta;
		if (moveTimer <= 0 && snake) {
			moveTimer = moveDelay;
			moveSnake();
		}
	}

	if (wallCount >= maxWalls) {
		if (totalSpawned < maxInvaders) {
			spawnTimer -= timeDelta;
			if (spawnTimer <= 0) {
				spawnTimer = 0.15;
				spawnInvader();
			}
		}

		updateInvaders();
		updateLasers();

		if (mouseWasPressed(0)) {
			shootLaser();
		}

		if (totalSpawned >= maxInvaders && invaders.length === 0 && stations.some(s => s.hp > 0)) {
			gameWon = true;
		}
	}

	if (stations.every(s => s.hp <= 0)) {
		gameOver = true;
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
			if (l.pos.distance(inv.pos) < 1) {
				inv.hp -= 2;
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
		pos, size: vec2(1, 1), hp: 1, maxHp: 1,
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

		const dirTo = nearest.pos.subtract(inv.pos).normalize(0.05);
		inv.pos = inv.pos.add(dirTo);

		if (inv.pos.distance(nearest.pos) < 1.5) {
			nearest.hp--;
			inv.hp = 0;
			sHit.play();
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

	// for (const s of snake) {
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
			const color = i % 2 ? [YELLOW, BLUE, GREEN, WHITE, ORANGE][j] : [ORANGE, WHITE, GREEN, BLUE, YELLOW][j];
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
			callback(newPos, size, color);
		}
	}
};

// --- Render ---
function gameRender() {
	drawRect(cameraPos, worldSize, rgb(0.05, 0.05, 0.08));

	for (const s of stations) {
		const bodyColor = s.hp > 0 ? rgb(0.8, 0.8, 1) : rgb(0.3, 0.3, 0.3);
		drawRect(s.pos.add(vec2(0.5)), vec2(3, 2), bodyColor);

		// Health bar
		const barWidth = 3;
		const hpPercent = clamp(s.hp / s.maxHp, 0, 1);
		const barPos = s.pos.add(vec2(0.5, 2));
		drawRect(barPos, vec2(barWidth, 0.3), rgb(0.2, 0.2, 0.2));
		drawRect(barPos.add(vec2(-(barWidth * (1 - hpPercent)) / 2, 0)), vec2(barWidth * hpPercent, 0.3), rgb(0.2, 1, 0.2));

		if (s.hp > 0) {
			drawLine(s.pos.add(vec2(0.5)), mousePos, 0.1, rgb(1, 1, 0.3));
		}
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

	for (const inv of invaders) {
		drawRect(inv.pos, inv.size, rgb(1, 0.2, 0.2));
	}

	for (const l of lasers) {
		drawRect(l.pos, vec2(0.3, 0.3), rgb(1, 1, 0.3));
	}
}

function gameRenderPost() {
	drawTextScreen('Walls: ' + wallCount + '/' + maxWalls, vec2(200, 40), 30);
	if (wallCount >= maxWalls) {
		const enemiesLeft = (maxInvaders - totalSpawned) + invaders.length;
		drawTextScreen('INVASION!  Enemies left: ' + enemiesLeft, vec2(mainCanvasSize.x / 2, 60), 40);
	}

	if (gameOver) {
		drawTextScreen('GAME OVER', mainCanvasSize.scale(0.5), 80);
	}

	if (gameWon) {
		drawTextScreen('YOU WIN!', mainCanvasSize.scale(0.5), 80);
	}
}

engineInit(gameInit, gameUpdate, 0, gameRender, gameRenderPost);
