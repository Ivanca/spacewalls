const xo = require('eslint-config-xo');

const xoConfig = Array.isArray(xo.default) ? xo.default : [xo.default];

module.exports = [
	...xoConfig,
	{
		files: ['game.js'],
		languageOptions: {
			globals: {
				vec2: 'readonly',
				Sound: 'readonly',
				canvasFixedSize: 'writable',
				cameraPos: 'writable',
				cameraScale: 'writable',
				keyDirection: 'readonly',
				sign: 'readonly',
				keyWasPressed: 'readonly',
				timeDelta: 'readonly',
				mouseWasPressed: 'readonly',
				mousePos: 'readonly',
				randInt: 'readonly',
				drawRect: 'readonly',
				rgb: 'readonly',
				clamp: 'readonly',
				drawLine: 'readonly',
				drawTextScreen: 'readonly',
				mainCanvasSize: 'readonly',
				engineInit: 'readonly',
				isOverlapping: 'readonly',
				BLACK: 'readonly',
				WHITE: 'readonly',
				YELLOW: 'readonly',
				RED: 'readonly',
				GREEN: 'readonly',
				BLUE: 'readonly',
				ORANGE: 'readonly',
			},
		},
	},
];
