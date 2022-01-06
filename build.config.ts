import { resolve } from 'path';
import { runNodejs, browserPlay, nodejsPlay, devNodejs, devBrowser, runBrowser } from './src';
import { BuilderUtil } from './src/general.utils';

(async function run([type]) {
    switch (type) {
        case 'prep:dist':
            await BuilderUtil.cleanDir('./dist');
            await BuilderUtil.copyFileHandler({ from: resolve('src/assets'), to: resolve('dist/assets') });
            break;
        case 'play:web':
        case 'play:browser':
            return browserPlay();
        case 'play:nodejs':
            return nodejsPlay();
        case 'run:nodejs':
            return runNodejs({ entryFile: 'src/browser.run.ts' }); // ./server/main.ts
        case 'run:browser':
            return runBrowser({ entryHTML: 'src/assets/browser/index.html' });
        case 'dev:browser':
            return devBrowser({
                fromDir: 'browser', // ./browser
                entryFile: 'index.tsx', // ./browser/index.tsx
                toDir: '.cache/web', // ./.cache/web
                // copy ./browser/index.html & ./browser/public/
                copyFiles: ['index.html', 'public']
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
