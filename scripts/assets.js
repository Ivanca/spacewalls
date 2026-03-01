export const imgs = {
	invader: 'images/invader2-42x42.png',
	spaceStation: 'images/space-station-94x60.png',
	deadSpaceStation: 'images/dead-space-station-94x60.png',
	explosion: 'images/explosion-18x18.png',
	bullet: 'images/bullet-24x24.png',
	wall: 'images/wall-16x16.png',
	blackHole: 'images/black-hole-438x438.png',
	goldUnitStar: 'images/gold-unit-star-21x21.png',
	silverUnitStar: 'images/silver-unit-star-21x21.png',
	squidAlien: 'images/squid-alien-32x32.png',
	stars: 'images/stars-18x18.png',
	/* Wall is a grid of 5 * 13 tiles, the top-left corner tile is at (0, 0), the top-right corner tile is at (4, 0),
	the bottom-left corner tile is at (0, 12), and the bottom-right corner tile is at (4, 12)
	the top 2 rows must be used in order (are continuations of the corners), as well as the 2 bottom rows (are continuations of the corners),
	the rows from 2 to 11 must be repeated for filler, the column order must be respected in all
	*/
};

export const imagesSrcArray = [];
let index = 0;
for (const key of Object.keys(imgs)) {
	imagesSrcArray[index] = imgs[key];
	imgs[key] = index;
	index++;
}
