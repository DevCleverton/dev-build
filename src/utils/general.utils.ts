import { networkInterfaces } from 'os';
import { Dict, interval, isType, min, minAppend, msToTime, objVals, rand } from '@giveback007/util-lib';
import { ensureDir, existsSync, readdirSync, remove } from 'fs-extra';
import path, { join } from 'path';
import chalk from 'chalk';
import readline from 'readline';
import type { FSWatcher } from 'chokidar';
import { config } from 'dotenv';
import { lstatSync } from 'fs';
import { BuilderUtil } from './builder.utils';

const { log } = console;


export function timeString(t: number) {
    try {
        if (t < 500) return `${t}ms`;
        if (t < min(1)) return (t / 1000).toFixed(1) + 's';
        const { d, h, m, s } = msToTime(t, true);
        const hours = (h || d) ? minAppend(h + d * 24, 2) + 'h ' : '';
        const mins = minAppend(m, 2) + 'm ';
        const secs = minAppend(s, 2) + 's';
    
        return hours + mins + secs;
    } catch {
        return msToTime(t);
    }
}


export function buildLogStart(opts: {
    from: string;
    to: string;
    root: string;
}) {
    const { frames, interval: frameMs } = spinners[rand(0, spinners.length - 1)];
    const { from, to, root } = opts;
    const fromTo = `[${chalk.green(from).replace(root, '')}] ${chalk.yellow('-→')} [${chalk.green(to).replace(root, '')}]`;

    const timeStart = Date.now();
    const itv = interval((i) => {
        const t = Date.now() - timeStart;

        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`> ${frames[i % frames.length]} ${chalk.blue('Building')} ${(t / 1000).toFixed(2)}s: ${fromTo}`);
    }, frameMs * 1.5);

    return {
        end: () => {
            itv.stop();
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            const t = Date.now() - timeStart;
            const isMs = t < 500;
            const timeStr = isMs ? `${t}ms` : `${(t / 1000).toFixed(2)}s`;

            log(`> ${chalk.green('✔')} ${chalk.blue('Built in')} ${timeStr}: ${fromTo}`);
        }
    };
}



export function network() {
    let ip: string | undefined;
    const ifaces = networkInterfaces();
    const wifiKey = Object.keys(ifaces).find((k) => k.search('Wi-Fi') > -1);
    if (wifiKey) {
        const x = ifaces[wifiKey] || [];
        const y = x.find((x) => x.family === 'IPv4');
        ip = y?.address;
    }

    return ip;
}



export async function ensureStarterFiles(opts: {
    root: string; fromDir: string; starterFilesDir: string; overwrite?: boolean
}) {
    const { overwrite } = opts;
    const root = path.resolve(opts.root);
    const fromDir = join(root, opts.fromDir);

    if (overwrite) await remove(fromDir);
    if (!existsSync(fromDir)) {
        await ensureDir(fromDir);

        // const startFiles = opts.starterFilesDir ? join(root, opts.starterFilesDir) : join(__dirname, 'assets/browser');
        await Promise.all(readdirSync(opts.starterFilesDir).map((fl) => BuilderUtil.copyFileHandler({
            from: join(opts.starterFilesDir, fl),
            to: join(fromDir, fl)
        })));
    }
}


const spinners: {
    interval: number;
    frames: string[];
}[] = objVals({
    dots:{interval:180,frames:["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"]},
    dots2:{interval:180,frames:['⣷', '⣯', '⣟', '⡿', '⢿', '⣻', '⣽', '⣾']},
    line:{interval:180,frames:["-","\\","|","/"]},
    hamburger:{interval:200,frames:['☰', '☱', '☳', '☷', '☶', '☴']},
    boxBounce:{interval:200,frames:["▖","▘","▝","▗"]},
    arc:{interval:200,frames:["◜","◠","◝","◞","◡","◟"]},
    squareCorners:{interval:200,frames:["◰","◳","◲","◱"]},
    circleHalves:{interval:150,frames:["◐","◓","◑","◒"]},
    toggle:{interval:300,frames:["⊶ ","⊷ "]},
    arrow:{interval:180,frames:["←","↖","↑","↗","→","↘","↓","↙"]},
    arrow2:{interval:180,frames:["⬆️ ","↗️ ","➡️ ","↘️ ","⬇️ ","↙️ ","⬅️ ","↖️ "]},
    smiley:{interval:250,frames:["😃 ","😄 ", "😆 ", "😝 ", "😆 ", "😄 "]},
    monkey:{interval:250,frames:["🙈 ","🙈 ","🙉 ","🙊 "]},
    // hearts:{interval:250,frames:["💛 ","💙 ","💜 ","💚 ","❤️ "]},
    squares:{interval:250,frames:["🟥","🟧","🟨","🟧"]},
    clock:{interval:180,frames:["🕛","🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘","🕙","🕚"]},
    earth:{interval:200,frames:["🌍","🌏","🌎"]},
    moon:{interval:180,frames:["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"]},
    runner:{interval:220,frames:["🚶","🏃"]},
    dqpb:{interval:150,frames:["d","q","p","b"]},
    point:{interval:190,frames:["∙∙∙","●∙∙","∙●∙","∙∙●","∙∙∙"]},
    // hand1:{interval:350,frames:['✋','🖐️','🖖']},
    box1: {interval: 200,frames:['▁','▃','▄','▅','▆','▇','█','▇','▆','▅','▄','▃']},
    pong:{interval:80,frames:["▐⠂       ▌","▐⠈       ▌","▐ ⠂      ▌","▐ ⠠      ▌","▐  ⡀     ▌","▐  ⠠     ▌","▐   ⠂    ▌","▐   ⠈    ▌","▐    ⠂   ▌","▐    ⠠   ▌","▐     ⡀  ▌","▐     ⠠  ▌","▐      ⠂ ▌","▐      ⠈ ▌","▐       ⠂▌","▐       ⠠▌","▐       ⡀▌","▐      ⠠ ▌","▐      ⠂ ▌","▐     ⠈  ▌","▐     ⠂  ▌","▐    ⠠   ▌","▐    ⡀   ▌","▐   ⠠    ▌","▐   ⠂    ▌","▐  ⠈     ▌","▐  ⠂     ▌","▐ ⠠      ▌","▐ ⡀      ▌","▐⠠       ▌"]},
    bouncingBar:{interval:180,frames:["[    ]","[=   ]","[==  ]","[=== ]","[ ===]","[  ==]","[   =]"]},
    bouncingBall:{interval:180,frames:["( ●    )","(  ●   )","(   ●  )","(    ● )","(     ●)","(    ● )","(   ●  )","(  ●   )","( ●    )","(●     )"]},
    arrow3:{interval:200,frames:["▸▹▹▹▹","▹▸▹▹▹","▹▹▸▹▹","▹▹▹▸▹","▹▹▹▹▸"]},
    simpleDots:{interval:300,frames:[".  ",".. ","..."," ..","  .", "   "]}
});


export const onProcessEnd = (fct: (exitCode: number) => unknown) =>
    [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach(ev => process.on(ev, fct));


export const genWatchPaths = (dirs: string[], exts: string[]) =>
    dirs.map(d => exts.map(ex => join(d, '**', '*.' + ex))).flat(Infinity) as string[];


export async function waitForFSWatchersReady(watchers: (undefined | null | false | FSWatcher)[]) {
    const arr = watchers.filter(x => x) as FSWatcher[];
    const n = arr.length;
    if (!n) return;
    
    let i = 0;
    
    await (new Promise((res) =>
        arr.forEach(w => w.once('ready', () => (++i === n) && res(true)))));
}

/** Takes an array of file paths and separates them into: `[files, directories]` */
export function filesAndDirs(files: string[]) {
    const fls: string[] = [];
    const dirs: string[] = [];

    files.forEach(async fl =>
        lstatSync(fl).isDirectory() ? dirs.push(fl) : fls.push(fl));

    return [fls, dirs] as [string[], string[]];
}


export const logCl = (txt: string, color: 'red' | 'green' | 'blue' | 'yellow' | 'white' = 'red') => log(chalk.bold[color](txt));


export function logAndExit(txt: string, color: 'red' | 'green' | 'blue' | 'yellow' | 'white' = 'red') {
    log(chalk.bold[color](txt));
    return process.exit();
}


export function logAndThrow(txt: string, color: 'red' | 'green' | 'blue' | 'yellow' | 'white' = 'red') {
    log(chalk.bold[color](txt));
    throw new Error();
}


export const makeJoinFct = (rootDir: string) => <D extends string | string[]>(toJoin: D): D => {
    if (isType(toJoin, 'string')) return join(rootDir, toJoin) as D;
    else return toJoin.map(x => join(rootDir, x)) as D;
};


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const arrEnsure = <T>(x: T): T extends Array<unknown> ? T : T[] => isType(x, 'array') ? x as any : [x];


export function configEnv(path: string) {
    const { error, parsed } = config({ path });
    
    if (error) {
        const msg = typeof error === 'string' ? error : error.message;
        console.log('\x1b[31m%s\x1b[0m', "\nERROR .env' file:\n", '\t' + msg);

        return false;
    }

    return parsed as Dict<string> || false;
}


export function changeExtension(file: string, extension: string) {
    const basename = path.basename(file, path.extname(file))
    return path.join(path.dirname(file), basename + extension)
}



// export const browserFiles = () => ({
//     'package.json': /* json */
// `{
//     "name": "playground",
//     "version": "0.0.1",
//     "description": "",
//     "main": "index.js",
//     "author": "",
//     "dependencies": {}
// }`,

//     'index.html': /* html */
// `<!DOCTYPE html>
//     <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width">
//         <meta http-equiv="X-UA-Compatible" content="ie=edge">
//         <link rel="icon" type="image/png" sizes="256x256" href="fav.ico">
//         <link rel="stylesheet" href="./index.css">
//         <title>Browser Playground</title>
//     </head>
//     <body>
//         <div id='root'></div>
//         <script src='index.js'></script>

//         <script>
//             setTimeout(() => {
//                 const src = '/browser-sync/browser-sync-client.js';

//                 const hasBS = Array.from(document.querySelectorAll('script'))
//                 .find((x) => x.src.search(src) > -1)

//                 if (!hasBS) {
//                 const browserSyncScript = document.createElement('script');
//                 browserSyncScript.src = src;
//                 document.body.appendChild(browserSyncScript);
//                 }
//             }, 1000)
//         </script>
//     </body>
// </html>`,

//     'index.tsx': /* tsx */
// `import './index.scss';
// const { log } = console;

// log('Console works...')
// `,

//     'index.scss': /* scss */ '',
// });

// export const nodejsFiles = () => ({
//     'server.ts': /* ts */
// `const { log } = console;

// log('It Works!')`
// });

// PREVIOUS:
// Object.entries(browserFiles()).forEach(([fileName, txt]) => {
//     if (!existsSync(join(fromDir, fileName)))
//         writeFile(join(fromDir, fileName), txt);
// });