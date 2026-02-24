// --- Globals ---
const worldSize = vec2(50, 38);
let snake = null;
let snakeDirs = [];
let	dir;
const walls = [];
let wallCount = 0;
const maxWalls = 6;
let moveTimer = 0;
const moveDelay = 0.012;
let gameOver = false;
let stations = [];
let invaders = [];
let lasers = [];
let spawnTimer = 0;
let justChangedDirFrom = null;
let mustSolidifyNextTick = false;
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
	for (let i = 0; i < 50; i++) {
		snake.push(start.subtract(vec2(i * 2, 0).scale(0.1)));
		snakeDirs.push(dir.copy());
	}
}

function createStations() {
	const center = worldSize.scale(0.5);
	stations = [
		{pos: center.add(vec2(-4, 0)), hp: 10, maxHp: 10},
		{pos: center, hp: 10, maxHp: 10},
		{pos: center.add(vec2(4, 0)), hp: 10, maxHp: 10},
	];
}

// --- Update ---
function gameUpdate() {
	if (gameOver) {
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
			positionLogic(snake, snakeDirs, (pos, thickness, color) => {
				newWall.push({pos, thickness, color});
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
		spawnTimer -= timeDelta;
		if (spawnTimer <= 0) {
			spawnTimer = 0.5;
			spawnInvader();
		}

		updateInvaders();
		updateLasers();

		if (mouseWasPressed(0)) {
			shootLaser();
		}
	}

	if (stations.every(s => s.hp <= 0)) {
		gameOver = true;
	}
}

function shootLaser() {
	const alive = stations.filter(s => s.hp > 0);
	if (!alive.length) {
		return;
	}

	let best = alive[0];
	let minDist = mousePos.distance(best.pos);
	for (const s of alive) {
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
		for (const w of walls) {
			for (const p of w) {
				if (l.pos.distance(p.pos) < 0.6) {
					l.hit = true;
				}
			}
		}

		// Collide with invaders
		for (const inv of invaders) {
			if (l.pos.distance(inv.pos) < 1) {
				inv.hp--;
				l.hit = true;
				sHit.play(inv.pos);
			}
		}
	}

	lasers = lasers.filter(l => !l.hit && l.pos.x > -2 && l.pos.x < worldSize.x + 2 && l.pos.y > -2 && l.pos.y < worldSize.y + 2);
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
		pos, size: vec2(2, 2), hp: 4, maxHp: 4,
	});
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
		for (const w of walls) {
			const index = walls.indexOf(w);
			for (const p of w) {
				if (isOverlapping(inv.pos, inv.size, p.pos, p.thickness)) {
					inv.hp = 0;
					pointsCrashed.push({index, p});
				}
			}
		}

		// Remove all segments that were crashed on this tick
		for (const sc of pointsCrashed) {
			const {index} = sc;
			walls[index] = walls[index].filter(p => p !== sc.p);
		}
	}
}

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

	for (const s of snake) {
		if (s.x === head.x && s.y === head.y) {
			mustSolidifyNextTick = true;
			return;
		}
	}

	positionLogic(snake, snakeDirs, (pos, thickness) => {
		for (const w of walls) {
			for (const p of w) {
				if (isOverlapping(pos, thickness, p.pos, p.thickness)) {
					mustSolidifyNextTick = true;
				}
			}
		}
	});

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
			const thickness = vec2(0.2);
			const extra
				= dir.y === 1
					? vec2(j * 0.2, 0)
					: dir.y === -1
						? vec2(j * 0.2, 0)
						: dir.x === 1
							? vec2(0, j * 0.2)
							: vec2(0, j * 0.2);
			const newPos = pos.add(vec2(0.5)).add(extra);
			callback(newPos, thickness, color);
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
			drawRect(p.pos, p.thickness, rgb(0.5, 0.5, 0.5));
		}
	}

	if (snake) {
		positionLogic(snake, snakeDirs, (pos, thickness, color) => {
			drawRect(pos, thickness, color);
		});
		// Draw for debugging
		// drawRect(snake[0].add(vec2(-4.4, 1)), vec2(20, 1.2), YELLOW);
	}

	for (const inv of invaders) {
		drawRect(inv.pos, inv.size, rgb(1, 0.2, 0.2));

		const hpPercent = clamp(inv.hp / inv.maxHp, 0, 1);
		const barWidth = inv.size.x;
		const barPos = inv.pos.add(vec2(0, inv.size.y / 2));
		drawRect(barPos, vec2(barWidth, 0.2), rgb(0.2, 0.2, 0.2));
		drawRect(barPos.add(vec2(-(barWidth * (1 - hpPercent)) / 2, 0)), vec2(barWidth * hpPercent, 0.2), rgb(0.2, 1, 0.2));
	}

	for (const l of lasers) {
		drawRect(l.pos, vec2(0.3, 0.6), rgb(1, 1, 0.3));
	}
}

function gameRenderPost() {
	drawTextScreen('Walls: ' + wallCount + '/' + maxWalls, vec2(200, 40), 30);
	if (wallCount >= maxWalls) {
		drawTextScreen('INVASION!', vec2(mainCanvasSize.x / 2, 60), 40);
	}

	if (gameOver) {
		drawTextScreen('GAME OVER', mainCanvasSize.scale(0.5), 80);
	}
}

engineInit(gameInit, gameUpdate, 0, gameRender, gameRenderPost);
