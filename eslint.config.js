// What the package and its films are held to that the type checker does not hold: which part may build on which,
// the code rules of claude-review's page (whole-word names, no helper inside a function, no number without a name),
// and, in a film, a number only as the value of its script's timing. Formatting is Prettier's.
import { builtinModules } from 'node:module';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// What each part of src/ may build on: nothing reaches up into what is built on it. A part is a folder of src/, or
// the scene and the package's entry, a file each
const LAYERS = {
	domain: [],
	props: ['domain'],
	scene: ['domain', 'props'],
	direction: ['domain', 'props', 'scene'],
	moves: ['domain', 'props', 'scene', 'direction'],
	studio: ['domain', 'scene', 'direction'],
	adapters: ['domain', 'scene', 'direction', 'studio'],
	cli: ['domain', 'direction', 'studio', 'adapters'],
	index: ['domain', 'props', 'direction', 'moves']
};
const FILES_OF = {
	domain: ['src/domain/**'],
	props: ['src/props/**'],
	scene: ['src/scene.ts'],
	direction: ['src/direction/**'],
	moves: ['src/moves/**'],
	studio: ['src/studio/**'],
	adapters: ['src/adapters/**'],
	cli: ['src/cli/**'],
	index: ['src/index.ts']
};
// How an import from another part names each: a relative path that climbs to src/, then the part's folder or file
const NAMED_AS = {
	domain: 'domain/',
	props: 'props/',
	scene: 'scene\\.ts$',
	direction: 'direction/',
	moves: 'moves/',
	studio: 'studio/',
	adapters: 'adapters/',
	cli: 'cli/',
	index: 'index\\.ts$'
};
const CLIMBED_TO_SOURCE = '^\\.{1,2}/(\\.\\./)*';
// What each part may take of Playwright and of Node's own modules: nothing, so it is worked out without a browser
// and without Node; their types alone; or anything
const OUTSIDE = {
	domain: 'nothing',
	props: 'nothing',
	scene: 'nothing',
	direction: 'types',
	moves: 'nothing',
	studio: 'nothing',
	adapters: 'anything',
	cli: 'anything',
	index: 'nothing'
};
const PLAYWRIGHT = '^playwright-core(/.*)?$';
const NODE = `^(node:.+|(${builtinModules.join('|')})(/.*)?)$`;
// The package names its own parts by path: by its name it would reach the copy a film resolves
const ITSELF = '^livereel$';

function layerPatterns(part) {
	const unreachable = Object.keys(NAMED_AS).filter((other) => other !== part && !LAYERS[part].includes(other));
	const climbs = {
		regex: `${CLIMBED_TO_SOURCE}(${unreachable.map((other) => NAMED_AS[other]).join('|')})`,
		message: `${part} builds only on ${LAYERS[part].join(', ') || 'itself'}`
	};
	const itself = { regex: ITSELF, message: 'a part of livereel imports another by its path' };
	return [climbs, itself, ...outsidePatterns(OUTSIDE[part], part)];
}

function outsidePatterns(allowed, part) {
	const message = `${part} is worked out without a browser and without Node`;
	switch (allowed) {
		case 'nothing':
			return [
				{ regex: PLAYWRIGHT, message },
				{ regex: NODE, message }
			];
		case 'types':
			return [
				{ regex: PLAYWRIGHT, message, allowTypeImports: true },
				{ regex: NODE, message, allowTypeImports: true }
			];
		case 'anything':
			return [];
	}
	throw new Error(`no such reach outside the package: ${allowed}`);
}

const layerRules = Object.keys(LAYERS).map((part) => ({
	files: FILES_OF[part],
	rules: { 'no-restricted-imports': ['error', { patterns: layerPatterns(part) }] }
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
// A module is loaded where it is named, so the layers above see every import: only a film file is loaded by its path
const NO_LOADING_BY_PATH = {
	selector: 'ImportExpression',
	message: 'A module is imported where it is named; only the command line loads a film by its path.'
};
// The film's own clock is its frames: what is worked out of a film reads no wall clock and waits on no timer
const WALL_CLOCK = ['Date', 'performance', 'setTimeout', 'setInterval', 'setImmediate', 'requestAnimationFrame'].map(
	(name) => ({ name, message: "A frame is a moment of the film's own clock, not of the wall's." })
);
// The parts worked out without a browser and without Node, and the stage, which draws what it is handed
const OWN_CLOCK = [
	'src/domain/**',
	'src/props/**',
	'src/scene.ts',
	'src/direction/**',
	'src/moves/**',
	'src/studio/**',
	'stage/*.js'
];
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
// A constant named at the top holds its number in its own value, never in a function it holds
const AT_THE_TOP = `:matches(Program > VariableDeclaration, Program > ExportNamedDeclaration) ${A_NUMBER}:not(:function ${A_NUMBER})`;
const NUMBERS_ONLY_IN_THE_SCRIPT = {
	selector: `${A_NUMBER}:not(Property[key.name=${KEYWORD}] > .value, Property[key.name=${KEYWORD}] > UnaryExpression > .argument, ${AT_THE_TOP})`,
	message: "A film's number is the value of a timing keyword in place, or a constant named at the top."
};

export default tseslint.config(
	// No linter reads the tests (.claude/rules/tests.md); what is built is not the source
	{ ignores: ['tests/', 'dist/', 'node_modules/'] },
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	{
		languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } }
	},
	{
		// The configs and the command's entry are plain JavaScript, outside the TypeScript program, run by Node
		files: ['*.js', 'bin/**/*.js'],
		...tseslint.configs.disableTypeChecked,
		languageOptions: { ...tseslint.configs.disableTypeChecked.languageOptions, globals: { process: 'readonly' } }
	},
	...layerRules,
	{
		files: ['src/**/*.ts', 'stage/*.js', 'examples/**/*.ts', 'scripts/*.ts'],
		rules: {
			'id-length': ['error', { min: 3, exceptions: SHORT_WORDS, properties: 'always' }],
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
		files: ['src/**/*.ts', 'stage/*.js'],
		rules: {
			'no-restricted-syntax': ['error', NO_NESTED_HELPERS, NO_LOADING_BY_PATH],
			'@typescript-eslint/no-magic-numbers': [
				'error',
				{
					// 0 and 1 are the ends of every share and every progress
					ignore: [0, 1],
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
		files: ['src/cli/film-file.ts'],
		rules: { 'no-restricted-syntax': ['error', NO_NESTED_HELPERS] }
	},
	{
		files: OWN_CLOCK,
		rules: { 'no-restricted-globals': ['error', ...WALL_CLOCK] }
	},
	{
		// The stage's script: JavaScript whose types JSDoc writes, so the type checker names what is undefined and
		// works out what a function hands back
		files: ['stage/*.js'],
		rules: { 'no-undef': 'off', '@typescript-eslint/explicit-function-return-type': 'off' }
	},
	{
		files: ['examples/**/*.ts'],
		rules: { 'no-restricted-syntax': ['error', NO_NESTED_HELPERS, NUMBERS_ONLY_IN_THE_SCRIPT] }
	}
);
