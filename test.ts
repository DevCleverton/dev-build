import { runNodejs, browserPlay, nodejsPlay, devNodejs, devBrowser } from './src';
// devBuildBrowser({
//     toDir: '.temp/web',
//     fromDir: 'playground/web',
//     entryFile: 'index.tsx',
//     port: 3333,
//     copyFiles: ['index.html', 'fav.ico']
// });

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
