import {vec2, isTouchDevice, time} from '../littlejs.esm.min.js';
import {
	timeDelta, keyWasPressed, getPaused, setPaused, mouseIsDown, mouseWasPressed, mousePos,
} from '../littlejs.esm.min.js';
import {
	extraWallScore, moveDelay, introGoodLuckDuration, worldSize, startingLevel,
} from './constants.js';
import {
	startNewSnake, solidifyWall, updateSnakeMovement, moveSnake, isSnakeCollidingWithBlackHole,
} from './snake.js';
import {createStations, updateStations, fixMedicStationPosition} from './stations.js';
import {spawnInvader, updateInvaders} from './invaders.js';
import {shootBullet, updateBullets, tryShootHealingBullet} from './bullets.js';
import {initializeStars} from './stars.js';
import { getTap, resetTap } from './input.js';
import {openPauseMenu} from './pause-menu.js';

export const state = {
	snake: null,
	snakeDirs: [],
	dir: vec2(1, 0),
	walls: [],
	wallCount: 0,
	maxWalls: 3,
	moveTimer: 0,
	gameOver: false,
	stations: [],
	invaders: [],
	explosions: [],
	bullets: [],
	spawnTimer: 0,
	totalSpawned: 0,
	killScore: 0,
	buildingPhase: false,
	justChangedDirFrom: null,
	mustSolidifyNextTick: false,
	gameWon: false,
	introActive: true,
	tempTitleTimer: 0,
	tempTitle: '',
	level: 1,
	blackHoles: [],
	hasBuiltWall: false,
	hasShot: false,
	maxInvaders: 1000,
	wallLength: 90,
	gameOverTime: 0,
};

export function resetGame(resetLevel = true, skipIntro = false) {
	state.snake = null;
	state.snakeDirs = [];
	state.dir = vec2(1, 0);
	state.walls = [];
	state.wallCount = 0;
	state.maxWalls = 3;
	state.moveTimer = 0;
	state.gameOver = false;
	state.stations = [];
	state.invaders = [];
	state.bullets = [];
	state.explosions = [];
	state.spawnTimer = 0;
	state.totalSpawned = 0;
	state.killScore = 0;
	state.buildingPhase = false;
	state.justChangedDirFrom = null;
	state.mustSolidifyNextTick = false;
	state.gameWon = false;
	state.introActive = !skipIntro;
	state.tempTitleTimer = 0;
	state.blackHoles = [];
	state.hasBuiltWall = false;
	state.maxInvaders = 1000;
	state.wallLength = 90;
	if (resetLevel) {
		state.level = startingLevel;
	}
	initializeStars();
	startNewSnake();
	createStations();
	if (state.level > 1) {
		const sumPos = state.stations.reduce((acc, s) => acc.add(s.pos), vec2(0, 0));
		const center = sumPos.scale(1 / state.stations.length);
		if (state.level === 2) {
			state.wallLength = 110;
			state.blackHoles = [{pos: center}];
			state.tempTitle = 'LEVEL 2 - THE BLACK HOLE AWAKENS';
			state.tempTitleTimer = 3;
		} else if (state.level >= 3) {
			state.wallLength = 110;
			const {bhPos1, bhPos2} = findBlackHolePositions(center);
			state.blackHoles = [{pos: bhPos1}, {pos: bhPos2}];
			state.tempTitle = 'LEVEL 3 - BINARY COLLAPSE';
			state.tempTitleTimer = 3;
			// we need to know the black hole positions before fixing the medic station position, so we do it here
			fixMedicStationPosition();
		}
	}
	if (skipIntro) {
		setPaused(false);
	} else {
		setPaused(true);
	}
}

function findBlackHolePositions(center) {
	const bhDist = 10;
	const minClearance = 5;
	const inBounds = p => p.x > 2 && p.x < worldSize.x - 2 && p.y > 2 && p.y < worldSize.y - 2;
	const baseAngle = Math.random() * Math.PI * 2;
	const steps = 3600;
	let bestP1 = null;
	let bestP2 = null;
	let bestMinDist = -Infinity;

	for (let i = 0; i < steps; i++) {
		const a = baseAngle + (i * Math.PI * 2) / steps;
		const p1 = center.add(vec2(Math.cos(a) * bhDist, Math.sin(a) * bhDist));
		const p2 = center.add(vec2(-Math.cos(a) * bhDist, -Math.sin(a) * bhDist));
		if (!inBounds(p1) || !inBounds(p2)) continue;
		const minDist = state.stations.reduce(
			(m, s) => Math.min(m, p1.distance(s.pos), p2.distance(s.pos)),
			Infinity,
		);
		if (minDist >= minClearance) {
			return {bhPos1: p1, bhPos2: p2};
		}
		if (minDist > bestMinDist) {
			bestMinDist = minDist;
			bestP1 = p1;
			bestP2 = p2;
		}
	}

	// No angle met the clearance threshold; use the best angle found
	if (bestP1) {
		console.log('No ideal black hole positions found; using best effort with min clearance of', bestMinDist);
		return {bhPos1: bestP1, bhPos2: bestP2};
	}

	// Absolute fallback: reduce distance until in-bounds position is found
	for (let dist = bhDist; dist >= 4; dist -= 0.5) {
		const p1 = center.add(vec2(dist, 0));
		const p2 = center.add(vec2(-dist, 0));
		if (inBounds(p1) && inBounds(p2)) {
			return {bhPos1: p1, bhPos2: p2};
		}
	}
	return {
		bhPos1: center.add(vec2(4, 0)),
		bhPos2: center.add(vec2(-4, 0)),
	};
}

function updateInvasionPhase() {
	if (state.totalSpawned < state.maxInvaders) {
		state.spawnTimer -= timeDelta;
		if (state.spawnTimer <= 0) {
			state.spawnTimer = isTouchDevice ? 0.13 : 0.1;
			spawnInvader();
		}
	}

	if (state.totalSpawned >= state.maxInvaders && state.invaders.length === 0 && state.stations.some(s => s.hp > 0)) {
		state.gameWon = true;
		setPaused(true);
		return;
	}

	updateInvaders();
	updateBullets();

	if (mouseWasPressed(0) || getTap()) {
		tryShootHealingBullet(mousePos);
	}

	if (mouseIsDown(0)) {
		shootBullet();
	}

	if (state.killScore >= extraWallScore && state.totalSpawned < state.maxInvaders) {
		state.buildingPhase = true;
		state.tempTitleTimer = 5;
		state.tempTitle = 'YOU EARNED ANOTHER WALL!\nPLACE IT WISELY';
		state.maxWalls++;
		setTimeout(() => {
			startNewSnake();
		}, 2500);
	}
}

export function gameUpdatePost() {
	const tap = getTap();
	resetTap();
	if (state.introActive) {
		if (keyWasPressed('Space') || tap) {
			state.introActive = false;
			state.tempTitleTimer = introGoodLuckDuration;
			state.tempTitle = 'GOOD LUCK!';
			setPaused(false);
		}
		return;
	}

	if (state.gameOver && (keyWasPressed('Space') || tap)) {
		resetGame(false, true);
		return;
	}

	if (state.gameWon && state.level === 1 && (keyWasPressed('Space') || tap)) {
		state.level = 2;
		resetGame(false);
		return;
	}

	if (state.gameWon && state.level === 2 && (keyWasPressed('Space') || tap)) {
		state.level = 3;
		resetGame(false);
		return;
	}

	if (!state.gameOver && !state.gameWon && keyWasPressed('Escape')) {
		openPauseMenu();
	}

	// if (getPaused() && (keyWasPressed('Space') || tap) && !state.gameOver && !state.gameWon) {
	// 	setPaused(false);
	// }

	if (state.tempTitleTimer > 0) {
		state.tempTitleTimer = Math.max(0, state.tempTitleTimer - timeDelta);
	}
}

export function gameUpdate() {
	if (getPaused()) {
		return;
	}

	if (state.snake) {
		const tap = getTap();
		updateSnakeMovement();

		if ((keyWasPressed('Space') || tap || state.mustSolidifyNextTick) && state.wallCount < state.maxWalls && !isSnakeCollidingWithBlackHole()) {
			solidifyWall();
			state.hasBuiltWall = true;
		}

		state.moveTimer -= timeDelta;
		if (state.moveTimer <= 0 && state.snake) {
			state.moveTimer = moveDelay;
			moveSnake();
		}
	}

	if (state.wallCount >= state.maxWalls) {
		updateInvasionPhase();
	}

	updateStations();

	if (state.stations.every(s => s.hp <= 0)) {
		state.gameOver = true;
		state.gameOverTime = Math.floor(time);
		console.log('Game over! All stations destroyed.', state.gameOverTime);
		setPaused(true);
	}
}
