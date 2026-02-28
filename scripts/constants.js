import {vec2} from '../littlejs.esm.js';

export const worldSize = vec2(50, 38);
export const stationSize = vec2(3, 2);
export const extraWallScore = 150;
export const moveDelay = 0.012;
export const maxInvaders = 900;
export const promotedThreshold = 70;
export const gameTextFont = 'PressStart2P';
export const introGoodLuckDuration = 2.2;
export const blackHoleRadius = 1.5;
export const introLines = `
Greetings General, first we enter the building stage
to deploy 3 walls to protect our space stations,
from invaders that will come from all
directions, remember that our stations
cant move but they can shoot.

PRESS SPACE TO START
`;
export const secondLevelIntroLines = `
Well done General, but another group of stations
need your help, unfortunately a black hole has
awakened in the middle of them and our intel says
that invaders will spawn from it, besides coming
from random directions as usual, prepare accordingly.

PRESS SPACE TO START LEVEL 2
`;
export const outroLines = `
Hey there I'm Ivan, the developer of this game,
if you're reading this, it means you finished the game, congrats!
If there is enough interest I might add more levels and content,
or create a mobile version, so if you want to support this effort,
consider sharing the game or following me on YouTube
`;
