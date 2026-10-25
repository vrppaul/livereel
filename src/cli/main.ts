/**
 * The command line: a command by name from the table, run; what it refuses said, and the exit code by whose it is
 * to put right — 2 for a wrong command line or film file, 1 for a film that could not be shot.
 */
import { LivereelError, UsageError } from '../domain/errors.ts';
import { COMMANDS, say } from './commands.ts';

const SHOT = 0;
const NOT_SHOT = 1;
const WRONG_USAGE = 2;
const HELP = new Set(['--help', '-h', 'help']);
// What the person gave comes after Node itself and the command's file
const GIVEN_FROM = 2;
const INTRODUCTION =
	'livereel: film a live web page — a camera, a light, a cursor and captions over it, frame by frame.';

async function main(given: readonly string[]): Promise<number> {
	const [name, ...rest] = given;
	if (name === undefined || HELP.has(name)) {
		say(usage());
		return name === undefined ? WRONG_USAGE : SHOT;
	}
	const command = COMMANDS.get(name);
	if (command === undefined) {
		process.stderr.write(`livereel has no command ${name}\n\n${usage()}\n`);
		return WRONG_USAGE;
	}
	try {
		await command.run(rest);
		return SHOT;
	} catch (fault) {
		if (!(fault instanceof LivereelError)) throw fault;
		process.stderr.write(`livereel ${name}: ${fault.message}\n`);
		return fault instanceof UsageError ? WRONG_USAGE : NOT_SHOT;
	}
}

function usage(): string {
	const rows = [...COMMANDS.values()].map((command) => `  ${command.usage}\n      ${command.summary}`);
	return [INTRODUCTION, '', ...rows].join('\n');
}

process.exitCode = await main(process.argv.slice(GIVEN_FROM));
