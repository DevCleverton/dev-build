// dev-builder play (web || node)
    // doing this should automatically using defaults start from playground web || node

// TODO: dev-builder play (web || node) (--overwrite || -O || -o) "this will clean up your playground code and start a fresh project"
// TODO: "playground will create some starter files to get you started on the project"
// TODO: "if you want to specify a different set of starter files you can point to a directory that will copied from"
// TODO: way to configure to run browser and nodejs congruently
// TODO: browser & nodejs debug in vscode
// nodejs.dev // TODO: add comments on every opts arg

export * from './browser.dev';
export * from './browser.play';
export * from './nodejs.dev';
export * from './nodejs.run';
export * from './nodejs.play';

const isCLI = require.main === module;
if (isCLI) import('./cli').then(({ runCLI }) => runCLI(process.argv.slice(2)));