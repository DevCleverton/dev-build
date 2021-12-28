An out of the box, typescript enabled, dev builder for nodejs and browser-spa's, with live reloading, sourcemaps, & playgrounds for experiments.

Using [esbuild](https://github.com/evanw/esbuild), [browser-sync](https://github.com/BrowserSync/browser-sync), [chokidar](https://github.com/paulmillr/chokidar), & [esbuild-register](https://github.com/egoist/esbuild-register) under the hood. Integrated together to remove the need for configuration.

## Install

Install via npm or yarn:

```console
$ npm install build-dev -D
<or>
$ yarn add build-dev -D
```
## Example Build File
```console
$ node builder.config.ts <any-cmd, eg: play:browser>
```
```js
// ./builder.config.js
import { runNodejs, browserPlay, nodejsPlay, devNodejs, devBrowser } from 'build-dev';

(async function run([type]) {
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
                // ./src/index.html -> ./.cache/index.html
                // ./src/public/ -> 
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
To prevent unwanted code & experiments to be committed to your repo: add `playground` & `.temp` (or the corresponding `fromDir` & `toDir` used for playgrounds) to your `.gitignore.` file.

```
# example .gitignore
node_modules
dist
playground
.temp
.cache
```

<!-- TODO -->
## Example Scripts With CLI
### CLI Playground
Use this to start up a code playground from the command line
```console
## for browser:
$ yarn run builder-dev play browser

## for node
$ yarn run builder-dev play nodejs

## to clean playground files and start fresh
$ yarn run builder-dev play browser -O
$ yarn run builder-dev play nodejs -O
```

# Browser

## Run
```ts
```
## Playground
## Dev
<!-- TODO: ## Build For NMP -->
<!-- TODO: ## Build For Browser -->
# NodeJs
<!-- TODO: ## Run -->
## Playground
## Dev
<!-- TODO: ## Build For NMP -->
<!-- TODO: ## Build For Browser -->

<!-- TODO -->
# Example Of Multi-Project Repo
You can use `builder-dev` to keep and run multiple projects from a single repo. This can be useful when you have many small pet projects and want to keep them in one place
## TODO
<!-- TODO -->