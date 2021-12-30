An out of the box, typescript enabled, dev builder for nodejs and browser-spa's, with live reloading, sourcemaps, & playgrounds for experiments.

Using [esbuild](https://github.com/evanw/esbuild), [browser-sync](https://github.com/BrowserSync/browser-sync), [chokidar](https://github.com/paulmillr/chokidar), & [esbuild-register](https://github.com/egoist/esbuild-register) under the hood. Integrated together in a way to remove the need for configuration.

# Getting Started
## Install
Install via npm or yarn:

```console
$ npm install build-dev -D
<or>
$ yarn add build-dev -D
```
## CLI
Use this to start up a code playground from the command line:
```console
## start playground
$ yarn run build-dev play nodejs

## clean playground files and start fresh
$ yarn run build-dev play nodejs -O

## Watch, run, & reload on save node project from source (can run typescript files):
$ yarn run build-dev run ./server/main
```
## Example Build File
In most cases you can just copy this example and edit `fromDir` to match your src directory for a quick start.
```console
$ node builder.config dev:browser
```
```js
// ./builder.config.js
import { runNodejs, browserPlay, nodejsPlay, devNodejs, devBrowser } from 'build-dev';

(function run([type]) {
    switch (type) {
        case 'play:browser':
            return browserPlay();
        case 'play:nodejs':
            return nodejsPlay();
        case 'run:nodejs':
            return runNodejs({ entryFile: './server/main' }); // ./server/main.ts
        case 'dev:browser':
            return devBrowser({
                fromDir: 'src', // ./src
                entryFile: 'index.tsx', // ./src/index.tsx
                toDir: '.cache/web', // ./.cache/web
                copyFiles: ['index.html', 'public'] // copy
                // ./src/index.html -> ./.cache/index.html (watch /index.html for changes and copy)
                // ./src/public/ -> ./.cache/public/ (watch all files in /public/ directory and copy)
            });
        case 'dev:nodejs':
            return devNodejs({
                fromDir: 'server', // ./server
                entryFile: 'main.ts', // ./server/main.ts
                toDir: '.cache/node' // ./.cache/node
            });
        default:
            throw new Error(`"${type}" not implemented`);
    }
})(process.argv.slice(2));
```

## .gitignore
To prevent unwanted code or experiments to be committed to your repo: add `playground` & `.temp` (or the corresponding `fromDir` & `toDir` playground dirs) to your `.gitignore.` file.

```
# example .gitignore
node_modules
dist
playground
.temp
.cache
```

<!-- TODO
# CLI
### CLI Playground
Use this to start up a code playground from the command line:
```console
## for browser:
$ yarn run build-dev play browser

## for node
$ yarn run build-dev play nodejs

## to clean playground files and start fresh
$ yarn run build-dev play browser -O
$ yarn run build-dev play nodejs -O
```

### CLI Run
Run a node project (will run typescript files):
```console
$ yarn run build-dev run ./server/main
``` -->

# Playgrounds
Playgrounds allow you to start up a temporary and separate dev environment. You can focus-in  on only what you need in isolation making it easier & faster both for building and debugging.
You can import from source any relevant code without extra code overhead.

## Browser-Play
### CLI
```console
$ yarn run build-dev play browser
## Optional Arg: `--overwrite` or `-O` clean playground to start fresh.
```
### Programmatic
```js
import { browserPlay } from 'build-dev';
browserPlay();
```
```ts
type Options = {
    /** Default: `"./"` */
    rootDir?: string;
    /** Default: `"playground/web"` */
    playgroundDir?: string;
    /** Be careful this dir gets cleaned out on start. Default: `".temp/web"` */
    outCacheDir?: string;
    /** Default: `"index.tsx"` */
    entryFile?: string;
    /** Default: `['index.html', 'fav.ico']` */
    copyFiles?: string[];
    /** Default: `3333` */
    port?: number;
    /** Playground will create some starter files to speed things up, if you want to specify
     * a different set of starter files you can point to a directory that will be copied from.
     * Eg: `"./playground-init"`.
     */
    starterFilesDir?: string;
    /** Other dirs that on change should trigger a build. */
    watchOtherDirs?: string[];
    /** Setting this to true will delete all files in `playgroundDir` and replace with new starter files. */
    overwrite?: boolean;
}
```
## NodeJs-Play
### CLI
```console
$ yarn run build-dev play nodejs
## Optional Arg: `--overwrite` or `-O` clean playground to start fresh.
```
### Programmatic
```js
import { nodejsPlay } from 'build-dev';
nodejsPlay();
```
```ts
type Options = {
    /** Default: `"./"` */
    rootDir?: string;
    /** Default: `"playground/node"` */
    playgroundDir?: string;
    /** Be careful this dir gets cleaned out on start. Default: `".temp/node"` */
    outCacheDir?: string;
    /** Default: `"server.ts"` */
    entryFile?: string;
    /** Default: `[]` */
    copyFiles?: string[];
    /** Playground will create some starter files to speed things up, if you want to specify
     * a different set of starter files you can point to a directory that will be copied from.
     * Eg: `"./playground-init"`.
     */
     starterFilesDir?: string;
     /** Other dirs that on change should trigger a build. */
    watchOtherDirs?: string[];
    /** Setting this to true will delete all files in `playgroundDir` and replace with new starter files. */
    overwrite?: boolean;
}
```

# Dev Environment
For your main build only need to define a few parameters to get started.

## Browser
### Programmatic
```js
// Example minimum setup:
import { devBrowser } from 'build-dev';
devBrowser({
    fromDir: 'browser',
    entryFile: 'index.tsx',
    toDir: '.cache/web',
    copyFiles: ['index.html', 'public']
});
```
```ts
type Options = {
    /** Directory of entry file relative to `projectRoot`. Eg: `"./src" or "src"`.
     * 
     * Resolution order: [projectRoot + fromDir + entryFile]
     */
    fromDir: string;
    /** Entry file relative to `fromDir`. Eg: `"index.tsx"`.
     * 
     * Resolution order: [projectRoot + fromDir + entryFile]
     */
    entryFile: string;
    /** Out directory relative to `projectRoot`. Eg: `"./dist" or "dist"`.
     * 
     * Resolution order: [projectRoot + toDir]
     */
    toDir: string;
    /** Other dirs besides `fromDir` that on change should trigger build & browser refresh.
     * 
     * Eg: `['utils', 'common']`
     */
    watchOtherDirs?: string[];
    /** List of css extensions to watch for changes. This will only build css files and hot-reload
     * them without refreshing the browser.
     * 
     * Default: `['sass', 'scss', 'css']`. Specifying this replaces the defaults completely.
     */
    cssExts?: string[];
    /** List of js/ts/etc.. extensions to watch for changes. This will build and reload the browser.
     * 
     * Default: `['tsx', 'ts', 'js', 'jsx', 'json']`. Specifying this replaces the defaults completely.
     */
    jsExts?: string[];
    /** Relative path of project root. Eg `"./"` or `"./my-project"`
     * 
     * Default: `'./'`
     */
    projectRoot?: string;
    /** Files and directories to copy into toDir.
     * 
     * Eg: `['public', 'index.html']` ->
     * 
     * `"public"` will copy `<fromDir>/public"` into `<toDir>/public` as well as all the dirs contents and subdirectories.
     * 
     * `"index.html"` will copy `<fromDir>/index.html` into `<toDir>/index.html`.
     */
    copyFiles?: string[];
    /** Localhost port for dev server. Eg `3000` -> `http://localhost:3000/`
     * 
     * Default: `3000`.
     */
    port?: number;
    /** Restrict the frequency of build events.
     * 
     * Will wait `debounceMs` of milliseconds after last file save before starting to build.
     * 
     * Default: `350`
     */
    debounceMs?: number;
}
```

## NodeJs
### Programmatic
```js
// Example minimum setup:
import { devNodejs } from 'build-dev';
devNodejs({
    fromDir: 'server',
    entryFile: 'main.ts',
    toDir: '.cache/node'
});
```
```ts
// Same as in `devBrowser` options.
type Options = {
    fromDir: string;
    entryFile: string;
    toDir: string;
    watchOtherDirs?: string[];
    jsExts?: string[];
    projectRoot?: string;
    copyFiles?: string[];
    debounceMs?: number;
};
```

# Run From Source
You can run your Nodejs project immediately by only specifying your entry file.
<!-- TODO ### Browser
```ts
``` -->

## NodeJs
### CLI
```console
$ yarn run build-dev run ./server/main
```

### Programmatic
```js
// Example minimum setup:
import { runNodejs } from 'build-dev';
runNodejs({ entryFile: './server/main' });
```
```ts
type Options = {
    /** Entry file of node .js or .ts file. */
    entryFile: string;
    /** Arguments to pass on to Node */
    nodeArgs?: string[];
    /** List of files & directories to watch, if not specified then dir that `entryFile` belongs to will be used. */
    watch?: string[];
    /** List of file extensions to watch. Default: `['ts', 'js', 'json']` */
    exts?: string[];
}
```

# Build Prod
## TODO*
<!-- TODO: ## Browser Build For NMP -->
<!-- TODO: ## Browser Build For Browser -->
<!-- TODO: ## Build For NMP -->
<!-- TODO: ## Build For Browser -->

<!-- TODO -->
# Example Of Multi-Project Repo
You can use `build-dev` to keep and run multiple projects from a single repo. This can be useful when you have many small projects and want to keep them in one place.
## TODO*
<!-- TODO -->