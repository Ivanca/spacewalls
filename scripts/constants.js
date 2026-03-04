import {vec2, isTouchDevice} from '../littlejs.esm.js';

// Mutable – x/y are filled in by game.js before engineInit based on screen size
// Change to 2 or 3 to skip straight to that level (useful for testing)
export const startingLevel = 3;
export const worldSize = vec2(50, 38);
export const stationSize = vec2(3, 2);
export const extraWallScore = 130;
export const moveDelay = 0.012;
export const promotedThreshold = 50;
export const gameTextFont = 'PressStart2P';
export const introGoodLuckDuration = 2.2;
export const blackHoleRadius = 1.5;
const actionText = isTouchDevice ? 'TAP' : 'PRESS SPACE'; 
export const introLines = `
Greetings General, first we enter the building stage
to deploy 3 walls to protect our space stations
from invaders that will come from all
directions, remember that our stations
cant move but they can shoot.

${actionText} TO START
`;
export const secondLevelIntroLines = `
Well done General, but another fleet of stations
need your help, unfortunately a black hole has
awakened in the middle of them and our intel says
that invaders will pour from it, besides coming
from random directions as usual, but there is good
news, a bigger budget for longer walls has been
approved, that should help with this new matter,
or should I say antimatter? haha, sorry


${actionText} TO START LEVEL 2
`;
export const thirdLevelIntroLines = `
Impressive work General, but our last and hardest
mission awaits. TWO black holes have awakened and
invaders will pour from both, but there is good news!
A REPAIR STATION has joined the fleet and it can fire
repair capsules once every 3 seconds, you can think
of them as bullets that heal, tap any damaged station
to fire them towards them

${actionText} TO START LEVEL 3
`;
export const outroLines = `
Hey there I'm Ivan, the developer of this game,
if you're reading this, it means you finished the game, congrats!
If there is enough interest I might add more levels and content,
or create a mobile version, so if you want to support this effort,
consider sharing the game or following me on YouTube
`;

export const credits = outroLines.split(`\n`).filter(e => !e.includes('congrats')).join('\n');
