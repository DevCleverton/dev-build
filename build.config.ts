import { resolve } from 'path';
import { runNodejs, browserPlay, nodejsPlay, devNodejs, devBrowser } from './src';
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
            return runNodejs({ entryFile: './server/main' }); // ./server/main.ts
        case 'dev:browser':
            return devBrowser({
                fromDir: 'playground/web', // ./browser
                entryFile: 'index.tsx', // ./browser/index.tsx
                toDir: '.cache/web', // ./.cache/web
                // copy ./browser/index.html & ./browser/public/
                copyFiles: ['index.html', 'public'],
                // env: { envFile: '.key' }
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
