// What the package and its films are held to that the type checker does not hold: which part may build on which,
// the code rules of claude-review's page (whole-word names, no helper inside a function, no number without a name),
// and, in a film, a number only as the value of its script's timing. Formatting is Prettier's.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// What each part of src/ may build on: nothing reaches up into what is built on it. A prop's folder holds two layers,
// told apart by the file: its state builds on the domain, its moves on the language films are written in, its
// drawer on its state and the stage's drawer alone
const LAYERS = {
	domain: ['domain'],
	'props/*/state': ['domain'],
	scene: ['domain', 'props/*/state'],
	direction: ['domain', 'scene', 'direction'],
	'props/*/moves': ['domain', 'scene', 'direction'],
	page: ['domain', 'direction'],
	studio: ['domain', 'scene', 'direction', 'studio'],
	adapters: ['domain', 'scene', 'direction', 'studio', 'stage/contract', 'adapters'],
	cli: ['domain', 'direction', 'studio', 'adapters'],
	'props/*/draw': ['domain', 'props/*/state', 'stage/drawer'],
	stage: ['domain', 'scene', 'props/*/draw', 'stage']
};
const FILES_OF = {
	domain: ['src/domain/**'],
	'props/*/state': ['src/props/*/state.ts'],
	scene: ['src/scene.ts'],
	direction: ['src/direction/**'],
	'props/*/moves': ['src/props/*/moves.ts'],
	page: ['src/page/**'],
	studio: ['src/studio/**'],
	adapters: ['src/adapters/**'],
	cli: ['src/cli/**'],
	'props/*/draw': ['src/props/*/draw.ts'],
	stage: ['src/stage/**']
};
// How each part is named when it is imported, as a regular expression: a pattern of the gitignore kind cannot name
// these, since it reads a leading `#` as a comment
const IMPORTED_AS = {
	domain: '#domain/.+',
	'props/*/state': '#props/[^/]+/state',
	scene: '#scene',
	direction: '#direction/.+',
	'props/*/moves': '#props/[^/]+/moves',
	page: '#page/.+',
	studio: '#studio/.+',
	adapters: '#adapters/.+',
	cli: '#cli/.+',
	'props/*/draw': '#props/[^/]+/draw',
	'stage/drawer': '#stage/drawer',
	'stage/contract': '#stage/contract',
	stage: '#stage/(?!drawer$|contract$).+'
};
// What is worked out without a browser and without Node: none of these imports Playwright or Node's own modules
const PURE = ['domain', 'props/*/state', 'scene', 'props/*/moves', 'page', 'studio', 'props/*/draw', 'stage'];
const BROWSER_OR_NODE = ['playwright-core', 'node:.+'];
// Climbing out of a folder reaches another part without naming it
const CLIMBING = '\\.\\./.*';

function outOfReach(part) {
	const unreachable = Object.keys(IMPORTED_AS)
		.filter((other) => !LAYERS[part].includes(other))
		.map((other) => IMPORTED_AS[other]);
	const alternatives = [...unreachable, CLIMBING, ...(PURE.includes(part) ? BROWSER_OR_NODE : [])];
	return `^(${alternatives.join('|')})$`;
}

const layerRules = Object.keys(LAYERS).map((part) => ({
	files: FILES_OF[part],
	rules: {
		'no-restricted-imports': [
			'error',
			{ patterns: [{ regex: outOfReach(part), message: `${part} builds only on ${LAYERS[part].join(', ')}` }] }
		]
	}
}));

// Short words that still say what they mean; anything else that short abbreviates, and `_` says nothing is kept
const SHORT_WORDS = ['_', 'id', 'at', 'to', 'ok', 'of', 'on', 'by', 'is'];
// A type parameter is a word, as `Name` or `Served` is, never one letter
const TYPE_NAME = '^[A-Z][a-z]';
// A helper is a function of its module, with a name and parameters of its own, not a closure in the body of another.
// A one-line lambda — passed to a call, or held as a property — is still fine; one with a body of statements is a
// helper wherever it is inside another function, and so is a function declared there, a function expression, a class
const NO_NESTED_HELPERS = {
	selector:
		':function :matches(ArrowFunctionExpression[expression=false], FunctionExpression, FunctionDeclaration, ClassDeclaration, ClassExpression)',
	message: 'A helper with logic is a function of the module, not one inside another.'
};
// The keywords a film writes its timing, framing and rhythm by, in place: a number stands there and nowhere else but
// in a constant named at the top of the film
const SCRIPT_KEYWORDS = [
	'seconds',
	'start',
	'end',
	'air',
	'zoomAtMost',
	'every',
	'tilt',
	'turn',
	'dim',
	'thinkingShare',
	'seed',
	'slipAt',
	'pace',
	'pixels',
	'top'
];
const KEYWORD = `/^(${SCRIPT_KEYWORDS.join('|')})$/`;
const A_NUMBER = 'Literal[raw=/^[0-9.]/]';
const NUMBERS_ONLY_IN_THE_SCRIPT = {
	selector: `${A_NUMBER}:not(Property[key.name=${KEYWORD}] > .value, Property[key.name=${KEYWORD}] > UnaryExpression > .argument, Program > VariableDeclaration ${A_NUMBER}, Program > ExportNamedDeclaration ${A_NUMBER})`,
	message: "A film's number is the value of a timing keyword in place, or a constant named at the top."
};

export default tseslint.config(
	// No linter reads the tests (.claude/rules/tests.md); what is built is not the source
	{ ignores: ['tests/', 'build/', 'dist/', 'node_modules/'] },
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	{
		languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } }
	},
	{
		// The configs and the command's entry are plain JavaScript, outside the TypeScript program, run by Node
		files: ['**/*.js'],
		...tseslint.configs.disableTypeChecked,
		languageOptions: { ...tseslint.configs.disableTypeChecked.languageOptions, globals: { process: 'readonly' } }
	},
	...layerRules,
	{
		files: ['src/**/*.ts', 'examples/**/*.ts'],
		rules: {
			'id-length': ['error', { min: 3, exceptions: SHORT_WORDS, properties: 'never' }],
			// id-length passes over type parameters; a type has a name, as a value does
			'@typescript-eslint/naming-convention': [
				'error',
				{ selector: 'typeParameter', format: ['PascalCase'], custom: { regex: TYPE_NAME, match: true } }
			],
			'no-restricted-syntax': ['error', NO_NESTED_HELPERS],
			// A function an interface asks for is a property: a method's parameters are compared loosely
			'@typescript-eslint/method-signature-style': ['error', 'property'],
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
			// A listener or a thunk is one expression here, and what it hands back is nobody's to read
			'@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
			'@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
			'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
			complexity: ['error', { max: 10, variant: 'modified' }]
		}
	},
	{
		files: ['src/**/*.ts'],
		rules: {
			'@typescript-eslint/no-magic-numbers': [
				'error',
				{
					ignore: [0, 1, -1],
					ignoreArrayIndexes: true,
					ignoreDefaultValues: true,
					ignoreEnums: true,
					ignoreNumericLiteralTypes: true,
					ignoreReadonlyClassProperties: true,
					ignoreTypeIndexes: true
				}
			]
		}
	},
	{
		files: ['examples/**/*.ts'],
		rules: { 'no-restricted-syntax': ['error', NO_NESTED_HELPERS, NUMBERS_ONLY_IN_THE_SCRIPT] }
	}
);
