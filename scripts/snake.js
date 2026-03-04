import {
	vec2, WHITE, sign, tile, keyDirection,
} from '../littlejs.esm.min.js';
import {state} from './state.js';
import {worldSize, blackHoleRadius} from './constants.js';
import {sWall} from './sounds.js';
import {imgs} from './assets.js';
import {getLastSwipeDirection, getTap} from './input.js';

function findFarthestPoint(listA, listB) {
	let farthestPoint = null;
	let maxMinDistance = -Infinity;

	for (const pointA of listA) {
		let minDistance = Infinity;

		for (const pointB of listB) {
			const d = pointA.distance(pointB);
			if (d < minDistance) {
				minDistance = d;
			}
		}

		if (minDistance > maxMinDistance) {
			maxMinDistance = minDistance;
			farthestPoint = pointA;
		}
	}

	return farthestPoint;
}

export function isSnakeCollidingWithBlackHole() {
	if (!state.blackHoles || !state.blackHoles.length || !state.snake) {
		return false;
	}
	const threshold = blackHoleRadius + 1;
	let isColliding = false;
	positionLogic(state.snake, state.snakeDirs, ({pos}) => {
		for (const bh of state.blackHoles) {
			if (pos.distance(bh.pos) < threshold) {
				isColliding = true;
			}
		}
	});
	return isColliding;
}

export function startNewSnake() {
	if (state.wallCount >= state.maxWalls) {
		state.snake = null;
		return;
	}

	state.snake = [];
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
	const allWallPointsPos = state.walls.flat().map(p => p.pos);
	if (allWallPointsPos.length) {
		start = findFarthestPoint(validStartPositions, allWallPointsPos);
	}

	state.dir = vec2(1, 0);
	state.snakeDirs = [];
	for (let i = 0; i < state.wallLength; i++) {
		state.snake.push(start.subtract(vec2(i * 2, 0).scale(0.1)));
		state.snakeDirs.push(state.dir.copy());
	}
}


export function updateSnakeMovement() {
	let input = keyDirection();
	    // Snake input (prevent reversing)
    let swipeDir = getLastSwipeDirection();
	if (swipeDir) {
		console.log('Swipe detected:', swipeDir);
	}
	if (swipeDir === 'up') {
		input = vec2(0, 1);
	} else if (swipeDir === 'down') {
		input = vec2(0, -1);
	} else if (swipeDir === 'left') {
		input = vec2(-1, 0);
	} else if (swipeDir === 'right') {
		input = vec2(1, 0);
	}

	if (input.x && !state.dir.x) {
		state.justChangedDirFrom = state.dir.copy();
		state.dir = vec2(sign(input.x), 0);
	} else if (input.y && !state.dir.y) {
		state.justChangedDirFrom = state.dir.copy();
		state.dir = vec2(0, sign(input.y));
	}
}

export function solidifyWall() {
	const newWall = [];
	positionLogic(state.snake, state.snakeDirs, ({pos, size, color, tile: t, isMiddle}) => {
		newWall.push({
			pos, size, color, tile: t, isMiddle,
		});
	});
	state.walls.push(newWall);
	state.wallCount++;
	sWall.play();
	startNewSnake();
	state.mustSolidifyNextTick = false;
	if (state.buildingPhase) {
		state.buildingPhase = false;
		state.killScore = 0;
	}
}

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

export function moveSnake() {
	let head = state.snake[0].add(state.dir.scale(0.2));
	if (state.justChangedDirFrom) {
		head = state.snake[0].add(getCornerOffset(state.dir, state.justChangedDirFrom));
		state.justChangedDirFrom = null;
	}

	head.x = ((head.x % worldSize.x) + worldSize.x) % worldSize.x;
	head.y = ((head.y % worldSize.y) + worldSize.y) % worldSize.y;

	// For (const s of state.snake) {
	// 	if (s.x === head.x && s.y === head.y) {
	// 		state.mustSolidifyNextTick = true;
	// 		return;
	// 	}
	// }

	// positionLogic(state.snake, state.snakeDirs, (pos, size) => {
	// 	for (const w of state.walls) {
	// 		for (const p of w) {
	// 			if (isOverlapping(pos, size, p.pos, p.size)) {
	// 				state.mustSolidifyNextTick = true;
	// 			}
	// 		}
	// 	}
	// });

	state.snake.unshift(head);
	state.snakeDirs.unshift(state.dir.copy());

	// Capture the direction of the tail segment about to be removed
	const poppedDir = state.snakeDirs[state.snakeDirs.length - 1].copy();
	state.snake.pop();
	state.snakeDirs.pop();

	// Fix corner tail disappearance order:
	// Find the last ≤5 segments that still have poppedDir.
	// If there is a direction change just before them (a corner), rotate both
	// their snakeDirs entry and their position 90° around the transition point
	// so they render on the correct side as the tail unwinds.
	if (state.snakeDirs.length > 0) {
		const tailIdx = state.snakeDirs.length - 1;
		let transitionIdx = -1;
		for (let i = tailIdx; i >= Math.max(0, tailIdx - 4); i--) {
			const d = state.snakeDirs[i];
			if (d.x !== poppedDir.x || d.y !== poppedDir.y) {
				transitionIdx = i;
				break;
			}
		}

		if (transitionIdx >= 0) {
			const nextDir = state.snakeDirs[transitionIdx];
			// The first poppedDir segment (transitionIdx+1) sits right at the corner base from
			// the old direction. Applying the same offset that getCornerOffset uses for the head
			// gives us the reference point in new-direction space. From there we walk backwards
			// in nextDir steps of 0.2 to place each remaining tail segment.
			const offset = getCornerOffset(nextDir, poppedDir);
			const cornerBase = state.snake[transitionIdx + 1].add(offset);
			for (let i = transitionIdx + 1; i <= tailIdx; i++) {
				state.snakeDirs[i] = nextDir.copy();
				const steps = i - (transitionIdx + 1);
				state.snake[i] = cornerBase.subtract(nextDir.scale(0.2 * steps));
			}
		}
	}
}

export const positionLogic = (snakePos, snakeDir, callback) => {
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
