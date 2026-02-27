import {
	vec2, rgb, WHITE, BLACK,
	clamp,
	cameraPos,
	drawRect, drawTile, drawTextScreen,
	tile,
	mainCanvasSize, mainContext,
	getPaused, time,
} from '../littlejs.esm.js';
import {state} from './state.js';
import {
	worldSize, stationSize, extraWallScore, gameTextFont, introLines, maxInvaders,
} from './constants.js';
import {imgs} from './assets.js';
import {positionLogic} from './snake.js';

export function gameRender() {
	drawRect(cameraPos, worldSize, rgb(0.05, 0.05, 0.08));

	for (const s of state.stations) {
		const imgIndex = s.hp > 0 ? imgs.spaceStation : imgs.deadSpaceStation;
		const hitElapsed = time - (s.lastHitTime ?? -Infinity);
		const blinkRed = s.hp > 0 && hitElapsed < 0.5 && Math.floor(hitElapsed / 0.1) % 2 === 0;
		const stationColor = blinkRed ? rgb(1, 0.1, 0.1) : WHITE;
		drawTile(s.pos, stationSize, tile(0, vec2(94, 60), imgIndex), stationColor);
		// DrawRect(s.pos, stationSize, rgb(0.2, 0.8, 1));
	}

	for (const w of state.walls) {
		for (const p of w) {
			// DrawRect(p.pos, p.size, rgb(0.5, 0.5, 0.5));
			drawTile(p.pos, p.size, p.tile, p.color);
		}
	}

	for (const e of state.explosions) {
		const frame = Math.floor((Date.now() - e.start) / 100) % 4;
		drawTile(e.pos, vec2(1), tile(frame, vec2(18, 18), imgs.explosion), rgb(1, 0.6, 0.2));
		e.frame++;
		if (e.frame > 3) {
			state.explosions = state.explosions.filter(ex => ex !== e);
		}
	}

	if (state.snake) {
		positionLogic(state.snake, state.snakeDirs, ({pos, size, color, _, __}) => {
			drawRect(pos, size, color);
		});
		// Draw for debugging
		// drawRect(state.snake[0].add(vec2(-4.4, 1)), vec2(20, 1.2), YELLOW);
	}

	const invFrame = Math.floor(Date.now() / 200) % 4;

	for (const inv of state.invaders) {
		// Rotate it 90 extra
		const angle = Math.atan2(-inv.dir.y, inv.dir.x) - (Math.PI / 2);
		inv.frameOffset ||= invFrame;
		if (!getPaused()) {
			inv.frame = (inv.frameOffset + invFrame) % 3;
		}

		// DrawRect(inv.pos, inv.size, rgb(1, 0.2, 0.2));

		drawTile(inv.pos, inv.size, tile(
			inv.frame,
			vec2(42, 42),
			imgs.invader,
		), WHITE, angle);
	}

	for (const l of state.lasers) {
		const angle = Math.atan2(-l.vel.y, l.vel.x);
		// DrawRect(l.pos, vec2(0.3, 0.3), rgb(1, 1, 0.3));
		drawTile(l.pos, vec2(0.3, 0.3), tile(0, vec2(24, 24), imgs.bullet), WHITE, angle);
	}

	for (const s of state.stations) {
		if ((state.wallCount >= state.maxWalls || state.buildingPhase) && s.hp > 0) {
			const barWidth = 3;
			const hpPercent = clamp(s.hp / s.maxHp, 0, 1);
			const barPos = s.pos.add(vec2(0.5, 2));
			drawRect(barPos, vec2(barWidth, 0.3), rgb(0.2, 0.2, 0.2));
			drawRect(barPos.add(vec2(-(barWidth * (1 - hpPercent)) / 2, 0)), vec2(barWidth * hpPercent, 0.3), rgb(0.2, 1, 0.2));
		}
	}
}

export function gameRenderPost() {
	if (state.introActive) {
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

	// DrawTextScreen('Walls: ' + state.wallCount + '/' + state.maxWalls, vec2(200, 40), 30, WHITE, 0, BLACK, 'center', gameTextFont);

	if (state.tempTitleTimer > 0) {
		drawTextScreen(state.tempTitle, vec2(mainCanvasSize.x / 2, 180), 52, WHITE, 0, BLACK, 'center', gameTextFont);
	}

	if (state.wallCount >= state.maxWalls || state.buildingPhase) {
		const enemiesLeft = (maxInvaders - state.totalSpawned) + state.invaders.length;
		drawTextScreen('Enemies left: ' + enemiesLeft, vec2(mainCanvasSize.x / 2, 60), 20, WHITE, 0, BLACK, 'center', gameTextFont);

		// Glowing cyan power bar
		{
			const ctx = mainContext;
			const barW = 320;
			const barH = 18;
			const barX = (mainCanvasSize.x / 2) - (barW / 2);
			const barY = 88;
			const fill = clamp(state.killScore / extraWallScore, 0, 1);

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

	if (state.gameOver) {
		drawTextScreen('GAME OVER', mainCanvasSize.scale(0.5), 80, WHITE, 0, BLACK, 'center', gameTextFont);
		drawTextScreen('PRESS SPACE TO RESTART', vec2(mainCanvasSize.x / 2, (mainCanvasSize.y / 2) + 60), 24, WHITE, 0, BLACK, 'center', gameTextFont);
	}

	if (state.gameWon) {
		drawTextScreen('YOU WIN!', mainCanvasSize.scale(0.5), 80, WHITE, 0, BLACK, 'center', gameTextFont);
	}
}
