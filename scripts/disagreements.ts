/**
 * What every gate of ours in TypeScript does with the places the repository disagrees with itself: says each on a
 * line of its own, on stdout, and exits 1; where there is none, it says nothing and exits 0. Each imports this module;
 * none runs it.
 */
const DISAGREE = 1;

/** The disagreements a gate found, said a line each, failing the run where there is any. */
export function reported(disagreements: readonly string[]): void {
	for (const disagreement of disagreements) process.stdout.write(`${disagreement}\n`);
	if (disagreements.length > 0) process.exitCode = DISAGREE;
}
