// The tests run the package's source as it stands, as development does: `livereel` itself resolves to src/ through
// the `source` condition. A film shot in a browser takes seconds, so a test may too.
import { defineConfig } from 'vitest/config';

const SOURCE = ['source'];
const A_FILM_IN_A_BROWSER = 60_000;

export default defineConfig({
	resolve: { conditions: SOURCE },
	ssr: { resolve: { conditions: SOURCE, externalConditions: SOURCE } },
	test: { include: ['tests/**/*.test.ts'], testTimeout: A_FILM_IN_A_BROWSER }
});
