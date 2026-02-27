import {vec2} from '../littlejs.esm.js';
import {
	timeDelta, keyWasPressed, getPaused, setPaused, mouseIsDown,
} from '../littlejs.esm.js';
import {
	maxInvaders, extraWallScore, moveDelay, introGoodLuckDuration,
} from './constants.js';
import {
	startNewSnake, solidifyWall, updateSnakeMovement, moveSnake,
} from './snake.js';
import {createStations, updateStations} from './stations.js';
import {spawnInvader, updateInvaders} from './invaders.js';
import {shootLaser, updateLasers} from './lasers.js';

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
	lasers: [],
	lastLaserTime: -1,
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
	blackHole: null,
};

export function resetGame() {
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
	state.lasers = [];
	state.explosions = [];
	state.spawnTimer = 0;
	state.totalSpawned = 0;
	state.killScore = 0;
	state.buildingPhase = false;
	state.justChangedDirFrom = null;
	state.mustSolidifyNextTick = false;
	state.gameWon = false;
	state.introActive = true;
	state.tempTitleTimer = 0;
	state.level = 1;
	state.blackHole = null;

	startNewSnake();
	createStations();
	setPaused(true);
}

export function startLevel2() {
	const alive = state.stations.filter(s => s.hp > 0);
	if (!alive.length) {
		return;
	}

	const sumPos = alive.reduce((acc, s) => acc.add(s.pos), vec2(0, 0));
	const center = sumPos.scale(1 / alive.length);

	state.blackHole = {pos: center};
	state.level = 2;
	state.invaders = [];
	state.lasers = [];
	state.explosions = [];
	state.totalSpawned = 0;
	state.spawnTimer = 0;
	state.killScore = 0;
	state.gameWon = false;
	state.buildingPhase = false;
	state.tempTitle = 'LEVEL 2 - THE BLACK HOLE AWAKENS';
	state.tempTitleTimer = 3;
	setPaused(false);
}

function updateInvasionPhase() {
	if (state.totalSpawned < maxInvaders) {
		state.spawnTimer -= timeDelta;
		if (state.spawnTimer <= 0) {
			state.spawnTimer = 0.15;
			spawnInvader();
		}
	}

	if (state.totalSpawned >= maxInvaders && state.invaders.length === 0 && state.stations.some(s => s.hp > 0)) {
		state.gameWon = true;
		setPaused(true);
		return;
	}

	updateInvaders();
	updateLasers();

	if (mouseIsDown(0)) {
		shootLaser();
	}

	if (state.killScore >= extraWallScore && state.totalSpawned < maxInvaders) {
		state.buildingPhase = true;
		state.tempTitleTimer = 3;
		state.tempTitle = 'YOU EARNED ANOTHER WALL!\nPLACE IT WISELY';
		state.maxWalls++;
		setTimeout(() => {
			startNewSnake();
		}, 2500);
	}
}

export function gameUpdatePost() {
	if (state.introActive) {
		if (keyWasPressed('Space')) {
			state.introActive = false;
			state.tempTitleTimer = introGoodLuckDuration;
			state.tempTitle = 'GOOD LUCK!';
			// StartLevel2(); // debugging
			setPaused(false);
		}

		return;
	}

	if (state.gameOver && keyWasPressed('Space')) {
		resetGame();
		return;
	}

	if (state.gameWon && state.level === 1 && keyWasPressed('Space')) {
		startLevel2();
		return;
	}

	if (!state.gameOver && !state.gameWon && keyWasPressed('Escape')) {
		setPaused(!getPaused());
	}

	if (getPaused() && keyWasPressed('Space') && !state.gameOver && !state.gameWon) {
		setPaused(false);
	}

	if (state.tempTitleTimer > 0) {
		state.tempTitleTimer = Math.max(0, state.tempTitleTimer - timeDelta);
	}
}

export function gameUpdate() {
	if (getPaused()) {
		return;
	}

	if (state.snake) {
		updateSnakeMovement();

		if ((keyWasPressed('Space') || state.mustSolidifyNextTick) && state.wallCount < state.maxWalls) {
			solidifyWall();
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
		setPaused(true);
	}
}
