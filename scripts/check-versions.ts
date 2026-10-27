/**
 * The version is one: package.json's, which npm publishes, and the plugin's in .claude-plugin/marketplace.json, which
 * Claude Code compares with the copy a person installed to tell whether the skill has changed.
 *
 * Neither tool reads the other's file, so a release sets both (CONTRIBUTING.md, Releasing). A plugin's version left
 * behind keeps the skill its users installed, whatever the package now does; one set ahead hands them a skill npm has
 * no package for. Nor can the plugin go without a version: Claude Code would hand its users every commit of main,
 * released or not.
 *
 * Run in the repository's root, as pre-commit runs it: `node -C source scripts/check-versions.ts`. It prints each
 * plugin whose version is not the package's, a line each, and exits 1; it prints nothing and exits 0 when they agree.
 */
import marketplace from '../.claude-plugin/marketplace.json' with { type: 'json' };
import packageManifest from '../package.json' with { type: 'json' };
import { reported } from './disagreements.ts';

const MARKETPLACE = '.claude-plugin/marketplace.json';
const PACKAGE_MANIFEST = 'package.json';
const packageVersion = packageManifest.version;

reported(
	marketplace.plugins
		.filter((plugin) => plugin.version !== packageVersion)
		.map((plugin) => `${MARKETPLACE} gives ${plugin.name} ${plugin.version}, ${PACKAGE_MANIFEST} ${packageVersion}`)
);
