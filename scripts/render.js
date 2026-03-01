import {
	vec2, rgb, WHITE, BLACK, ASSERT, isString, isVector2, isNumber, isColor, fontDefault,
	clamp,
	cameraPos,
	drawRect, drawTile,
	tile,
	mainCanvasSize, mainContext,
	getPaused, time,
	worldToScreen,
} from '../littlejs.esm.js';
import {state} from './state.js';
import {
	worldSize, stationSize, extraWallScore, gameTextFont, introLines, secondLevelIntroLines, outroLines, maxInvaders, promotedThreshold,
} from './constants.js';
import {imgs} from './assets.js';
import {positionLogic, isSnakeCollidingWithBlackHole} from './snake.js';
import {getStarsPositions} from './stars.js';

// ---------- Outro overlay (DOM elements shown on level 2 victory) ----------
let outroOverlayEl = null;
let outroBtnRow = null;

function ensureOutroOverlay() {
	if (outroOverlayEl) return;

	outroOverlayEl = document.createElement('div');
	outroOverlayEl.id = 'outro-overlay';
	outroOverlayEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:none;pointer-events:none;z-index:100;container-type: size;';

	outroBtnRow = document.createElement('div');
	outroBtnRow.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:16px;pointer-events:all;';

	const btnBase = [
		'background:#0a0a12',
		'color:#e0f8ff',
		'border:2px solid #00e8ff',
		'border-radius:6px',
		'padding:10px 22px',
		'font-family:PressStart2P,monospace',
		'font-size: 1.1cqi',
		'cursor:pointer',
		'text-shadow:0 0 8px #00e8ff',
		'box-shadow:0 0 14px #00e8ff55',
		'position:relative',
	].join(';');

	// --- Share button with dropdown ---
	const shareWrapper = document.createElement('div');
	shareWrapper.style.cssText = 'position:relative;';

	const shareBtn = document.createElement('button');
	shareBtn.textContent = 'Share Game';
	shareBtn.style.cssText = btnBase;

	const dropdown = document.createElement('div');
	dropdown.style.cssText = [
		'display:none',
		'position:absolute',
		'bottom:calc(100% + 8px)',
		'left:0',
		'background:#0a0a12',
		'border:2px solid #00e8ff',
		'border-radius:6px',
		'overflow:hidden',
		'z-index:101',
		'min-width:170px',
		'white-space:nowrap',
	].join(';');

	const gameUrl = 'https://www.spacewallsgame.com';
	const shareOpts = [
		['Twitter / X',  `https://twitter.com/intent/tweet?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent('Check out Space Walls! ')}` ],
		['Facebook',     `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameUrl)}`],
		['Bluesky',      `https://bsky.app/intent/compose?text=${encodeURIComponent('Check out Space Walls! ' + gameUrl)}`],
		['Instagram',    `https://www.instagram.com/`],
		['Email',        `mailto:?subject=${encodeURIComponent('Check out Space Walls!')}&body=${encodeURIComponent(gameUrl)}`],
	];

	for (const [label, href] of shareOpts) {
		const a = document.createElement('a');
		a.textContent = label;
		a.href = href;
		a.target = '_blank';
		a.rel = 'noopener noreferrer';
		a.style.cssText = 'display:block;padding:9px 16px;color:#e0f8ff;font-family:PressStart2P,monospace;font-size: 0.9cqi;text-decoration:none;';
		a.addEventListener('mouseenter', () => { a.style.background = 'rgba(0,232,255,0.15)'; });
		a.addEventListener('mouseleave', () => { a.style.background = ''; });
		dropdown.appendChild(a);
	}

	shareBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
	});
	document.addEventListener('click', () => { dropdown.style.display = 'none'; });

	shareWrapper.appendChild(dropdown);
	shareWrapper.appendChild(shareBtn);

	// --- YouTube button ---
	const ytBtn = document.createElement('button');
	ytBtn.textContent = 'YouTube Channel';
	ytBtn.style.cssText = btnBase.replace(/00e8ff/g, 'ff4040').replace(/00e8ff55/g, 'ff404055');
	ytBtn.addEventListener('click', () => {
		window.open('https://www.youtube.com/channel/UCtmf9FLAjo0W1SxfhCZzp1w?sub_confirmation=1', '_blank');
	});

	outroBtnRow.appendChild(shareWrapper);
	outroBtnRow.appendChild(ytBtn);
	outroOverlayEl.appendChild(outroBtnRow);
	document.body.appendChild(outroOverlayEl);
}
// -------------------------------------------------------------------------

function drawBlackHole() {
	if (!state.blackHole) {
		return;
	}

	const pulse = 1 + (0.08 * Math.sin(time * 3));
	const bhSize = vec2(5 * pulse, 5 * pulse);
	drawTile(state.blackHole.pos, bhSize, tile(0, vec2(438, 438), imgs.blackHole));
}


export function gameRender() {
	drawRect(cameraPos, worldSize, rgb(0.05, 0.05, 0.08));

	// draw random stars background
	let stars = getStarsPositions();
	for (let i = 0; i < stars.length; i++) {
		const pos = stars[i];
		drawTile(pos, vec2(0.1, 0.1), tile(i % 3, vec2(18, 18), imgs.stars));
	}

	drawBlackHole();

	for (const s of state.stations) {
		const imgIndex = s.hp > 0 ? imgs.spaceStation : imgs.deadSpaceStation;
		const hitElapsed = time - (s.lastHitTime ?? -Infinity);
		const blinkRed = s.hp > 0 && hitElapsed < 0.5 && Math.floor(hitElapsed / 0.1) % 2 === 0;
		const stationColor = blinkRed ? rgb(1, 0.1, 0.1) : WHITE;
		drawTile(s.pos, stationSize, tile(0, vec2(94, 60), imgIndex), stationColor);
		// DrawRect(s.pos, stationSize, rgb(0.2, 0.8, 1));
		if (s.hp > 0 && s.level >= 1) {
			const starSize = vec2(0.85, 0.85);
			const starPos = s.pos.add(vec2((stationSize.x / 2) - (starSize.x / 2), -((stationSize.y / 2) - (starSize.y / 2))));
			// make it flash when promoted, then stay solid after that
			if (time - 0.5 > s.promotedTime || Math.floor(time / 0.1) % 2 === 0) {
				drawTile(starPos, starSize, tile(0, vec2(21, 21), s.level >= 2 ? imgs.goldUnitStar : imgs.silverUnitStar));
			}
		}
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
		const snakeColor = isSnakeCollidingWithBlackHole() ? rgb(1, 0.2, 0.2) : WHITE;
		positionLogic(state.snake, state.snakeDirs, ({pos, size}) => {
			drawRect(pos, size, snakeColor);
		});
		// draw black hole as circle for debugging:
		// Draw for debugging
		// drawRect(state.snake[0].add(vec2(-4.4, 1)), vec2(20, 1.2), YELLOW);
	}

	const invFrame = Math.floor(Date.now() / 200) % 4;

	for (const inv of state.invaders) {
		// Rotate it 90 extra
		const angle = Math.atan2(-inv.dir.y, inv.dir.x) - (Math.PI / 2);
		inv.frameOffset ||= invFrame;
		if (!getPaused()) {
			inv.frame = (inv.frameOffset + invFrame) % 4;
		}

		// DrawRect(inv.pos, inv.size, rgb(1, 0.2, 0.2));

		drawTile(inv.pos, inv.size, tile(
			inv.frame,
			vec2(32, 32),
			imgs.squidAlien,
		), WHITE, angle);
	}

	for (const l of state.bullets) {
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

function drawTextScreen(text, pos, size, color=WHITE, lineWidth=0, lineColor=BLACK, textAlign='center', font=fontDefault, fontStyle='', maxWidth, lineHeight=1, angle=0, context=mainContext)
{
	ASSERT(isString(text), 'text must be a string');
	ASSERT(isVector2(pos), 'pos must be a vec2');
	ASSERT(isNumber(size), 'size must be a number');
	ASSERT(isColor(color), 'color must be a color');
	ASSERT(isNumber(lineWidth), 'lineWidth must be a number');
	ASSERT(isColor(lineColor), 'lineColor must be a color');
	ASSERT(['left','center','right'].includes(textAlign), 'align must be left, center, or right');
	ASSERT(isString(font), 'font must be a string');
	ASSERT(isString(fontStyle), 'fontStyle must be a string');
	ASSERT(isNumber(angle), 'angle must be a number');
	ASSERT(isNumber(lineHeight), 'lineHeight must be a number');

	context.fillStyle = color.toString();
	context.strokeStyle = lineColor.toString();
	context.lineWidth = lineWidth;
	context.textAlign = textAlign;
	context.font = fontStyle + ' ' + size + 'px '+ font;
	context.textBaseline = 'middle';

	const lines = (text+'').split('\n');
	const posY = pos.y - (lines.length-1) * (size * lineHeight)/2; // center vertically
	context.save();
	context.translate(pos.x, posY);
	context.rotate(-angle);
	let yOffset = 0;
	lines.forEach(line=>
	{
		lineWidth && context.strokeText(line, 0, yOffset, maxWidth);
		context.fillText(line, 0, yOffset, maxWidth);
		yOffset += size * lineHeight;
	});
	context.restore();
}


export function gameRenderPost() {
	if (state.introActive) {
		drawRect(mainCanvasSize.scale(0.5), mainCanvasSize, rgb(0, 0, 0, 0.78));
		const centerX = mainCanvasSize.x / 2;
		const centerY = mainCanvasSize.y / 2;
		const lineHeight = 34;
		const intro = state.level === 1 ? introLines : secondLevelIntroLines;

		drawTextScreen(
			intro,
			vec2(centerX, centerY),
			26,
			WHITE,
			0,
			BLACK,
			'center',
			gameTextFont,
			'',
			window.innerWidth * 0.75,
			1.5,
		);
		if (outroOverlayEl) outroOverlayEl.style.display = 'none';
		return;
	}

	// DrawTextScreen('Walls: ' + state.wallCount + '/' + state.maxWalls, vec2(200, 40), 30, WHITE, 0, BLACK, 'center', gameTextFont);

	if (state.tempTitleTimer > 0) {
		drawTextScreen(state.tempTitle, vec2(mainCanvasSize.x / 2, 180), 52, WHITE, 0, BLACK, 'center', gameTextFont);
	}

	if (!state.gameWon && (state.wallCount >= state.maxWalls || state.buildingPhase)) {
		const enemiesLeft = (maxInvaders - state.totalSpawned) + state.invaders.length;
		drawTextScreen(enemiesLeft + ' INVADERS REMAINING', vec2(mainCanvasSize.x / 2, 60), 20, WHITE, 0, BLACK, 'center', gameTextFont);

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
			ctx.fillText('ENEMIES SHOT CONSTRUCTION BONUS', mainCanvasSize.x / 2, barY - 4);

			ctx.restore();
		}
	}

	if (state.snake && !state.hasBuiltWall) {
		drawTextScreen('Use arrows to move, press space to build the wall', vec2(mainCanvasSize.x / 2, mainCanvasSize.y - 40), 18, WHITE, 0, BLACK, 'center', gameTextFont);
	}

	if (state.gameOver) {
		drawTextScreen('GAME OVER', mainCanvasSize.scale(0.5), 80, WHITE, 0, BLACK, 'center', gameTextFont);
		drawTextScreen('PRESS SPACE TO RESTART', vec2(mainCanvasSize.x / 2, (mainCanvasSize.y / 2) + 60), 24, WHITE, 0, BLACK, 'center', gameTextFont);
	}

	if (state.gameWon && state.level === 1) {
		drawTextScreen('LEVEL 1 CLEAR!', mainCanvasSize.scale(0.5), 80, WHITE, 0, BLACK, 'center', gameTextFont);
		drawTextScreen('PRESS SPACE FOR LEVEL 2', vec2(mainCanvasSize.x / 2, (mainCanvasSize.y / 2) + 60), 24, WHITE, 0, BLACK, 'center', gameTextFont);
	}

	if (state.gameWon && state.level === 2) {
		drawRect(mainCanvasSize.scale(0.5), mainCanvasSize, rgb(0, 0, 0, 0.82));
		const centerX = mainCanvasSize.x / 2;

		// Use worldToScreen to determine where the button row should sit (world y=7 ≈ lower third of canvas)
		const btnScreenPos = worldToScreen(vec2(worldSize.x / 2, 15));
		drawTextScreen('YOU WIN!', vec2(centerX, 240), 80, WHITE, 0, BLACK, 'center', gameTextFont);
		
		drawTextScreen(
			outroLines,
			vec2(centerX, mainCanvasSize.y * 0.45),
			20,
			WHITE,
			0,
			BLACK,
			'center',
			gameTextFont,
			'',
			window.innerWidth * 0.78,
			1.8,
		);

		// Show HTML buttons positioned via worldToScreen coordinates
		ensureOutroOverlay();
		outroBtnRow.style.top = `${btnScreenPos.y}px`;
		outroOverlayEl.style.display = 'block';
		return;
	}

	// Hide outro overlay when not on the victory screen
	if (outroOverlayEl) {
		outroOverlayEl.style.display = 'none';
	}
}
