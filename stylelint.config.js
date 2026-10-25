// The stage's styles name its tokens and write no colour of their own: a colour, a shadow or a gradient is written
// once, in tokens.css. Nothing on the stage moves of itself — no transition, animation or smooth scroll — since a
// style that moves the stage would move it between two frames. Formatting is Prettier's.
const COLOURS = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color-mix'];
const GRADIENTS_AND_SHADOWS = ['linear-gradient', 'radial-gradient', 'conic-gradient', 'drop-shadow'];
const MOVING = ['/^transition/', '/^animation/'];
// A shadow is a token, or none
const SHADOWS_NAMED = { '/shadow$/': ['/^var\\(--[a-z-]+\\)$/', 'none'] };

export default {
	extends: ['stylelint-config-standard'],
	rules: {
		'color-no-hex': true,
		'color-named': 'never',
		'function-disallowed-list': [...COLOURS, ...GRADIENTS_AND_SHADOWS],
		'declaration-property-value-allowed-list': SHADOWS_NAMED,
		'property-disallowed-list': MOVING,
		'at-rule-disallowed-list': ['keyframes'],
		'declaration-property-value-disallowed-list': { 'scroll-behavior': ['smooth'] }
	},
	overrides: [
		{
			files: ['stage/tokens.css'],
			rules: {
				'color-no-hex': null,
				'function-disallowed-list': null,
				'declaration-property-value-allowed-list': null
			}
		}
	]
};
