// The stage's styles name its tokens and write no colour of their own: a colour, a shadow or a gradient is written
// once, in tokens.css. Nothing on the stage moves of itself — no transition, animation or smooth scroll — since a
// style that moves the stage would move it between two frames. Formatting is Prettier's.
const WRITTEN_IN_THE_TOKENS = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color-mix'];
const MOVING = ['/^transition/', '/^animation/'];

export default {
	extends: ['stylelint-config-standard'],
	rules: {
		'color-no-hex': true,
		'color-named': 'never',
		'function-disallowed-list': WRITTEN_IN_THE_TOKENS,
		'property-disallowed-list': MOVING,
		'at-rule-disallowed-list': ['keyframes'],
		'declaration-property-value-disallowed-list': { 'scroll-behavior': ['smooth'] }
	},
	overrides: [
		{
			files: ['src/stage/tokens.css'],
			rules: { 'color-no-hex': null, 'function-disallowed-list': null }
		}
	]
};
