/**
 * Gun definitions. Each entry describes a weapon's behaviour as plain data so
 * that new gun types can be added here without touching any other file.
 *
 *   id         – used as the key and stored on each station
 *   fireRate   – minimum seconds between shots (cooldown)
 *   bullets    – array of projectile descriptors, one entry per projectile
 *                fired per trigger pull:
 *                  angleOffset  radians offset from the aim direction
 *                  speed        normalised velocity magnitude passed to vec2.normalize()
 */
export const GUNS = {
	basic: {
		id: 'basic',
		fireRate: 0.2,
		bullets: [
			{angleOffset: 0, speed: 0.6},
		],
	},

	rapid: {
		id: 'rapid',
		fireRate: 0.1,
		bullets: [
			{angleOffset: 0, speed: 0.6},
		],
	},

	spread: {
		id: 'spread',
		fireRate: 0.25,
		bullets: [
			{angleOffset: 0,                       speed: 0.6},
			{angleOffset:  5 * (Math.PI / 180),    speed: 0.6},
			{angleOffset: -5 * (Math.PI / 180),    speed: 0.6},
		],
	},
};

/**
 * Maps station level (0, 1, 2) to a gun id.
 * Extend this array when adding new levels or gun types.
 */
export const GUN_BY_LEVEL = ['basic', 'rapid', 'spread'];
