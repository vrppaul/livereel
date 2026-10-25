// A stylesheet imported by the stage's script is bundled into its own stylesheet by esbuild, and gives nothing to
// the script itself
declare module '*.css';
