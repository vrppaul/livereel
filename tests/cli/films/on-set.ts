// A film shot on its set: the smoke tests' page served by a command of its own while its set is shot, a state before
// and after typing into its field, and none served after, as the film shows the second state a tenth of a second in
import { act, defineFilm, hold } from 'livereel';

const FIELD = '[data-testid=field]';

export default defineFilm({
	formats: { small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } } },
	address: 'http://127.0.0.1:8773/',
	serve: 'node ../../smoke/serving.ts 8773',
	ready: (context) => context.page.locator('h1').waitFor(),
	set: {
		scenario: async ({ page, state }) => {
			await state('opened');
			await page.locator(FIELD).fill('hello');
			await state('typed');
		},
		targets: [FIELD]
	},
	steps: () => [hold({ seconds: 0.1 }), act(({ set }) => set.show('typed')), hold({ seconds: 0.1 })]
});
