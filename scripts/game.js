import {setCameraPos, setCameraScale, engineInit} from '../littlejs.esm.js';
import {worldSize} from './constants.js';
import {imagesSrcArray} from './assets.js';
import {resetGame, gameUpdate, gameUpdatePost} from './state.js';
import {gameRender, gameRenderPost} from './render.js';

function gameInit() {
	// CanvasFixedSize = vec2(1280, 720);
	setCameraPos(worldSize.scale(0.5));
	setCameraScale(23);

	resetGame();
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, imagesSrcArray);
