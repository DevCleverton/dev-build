import type { BuildOptions, BuildResult } from 'esbuild';
import { build as esbuild } from 'esbuild';
import { networkInterfaces } from 'os';
import postCssPlugin from "esbuild-plugin-postcss2";
import { debounceTimeOut, Dict, interval, isType, min, minAppend, msToTime, objVals, rand } from '@giveback007/util-lib';
import { copy, ensureDir, existsSync, lstat, mkdir, readdirSync, remove } from 'fs-extra';
import path, { join } from 'path';
import chokidar from 'chokidar';
import chalk from 'chalk';
import readline from 'readline';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

const { log } = console;

type CopyFromTo = { from: string; to: string; };
export type CopyAction = 'add'|'addDir'|'change'|'unlink'|'unlinkDir'|'copy';
// export type NodeTranspiler = (files: string[], toDir: string, opts?: {changeBuildOpts?: BuildOptions}) => Promise<BuildResult>;
export type NodeTranspiler = (entryFile: string, outFile: string, opts?: {changeBuildOpts?: BuildOptions}) => Promise<BuildResult>;
export type BrowserTranspiler = (entryFile: string, toDir: string, opts?: {changeBuildOpts?: BuildOptions, envVars?: Dict<string>}) => Promise<BuildResult>;

export type BuilderOpt = {
    projectRoot: string;
    fromDir: string;
    toDir: string;
    buildFct: () => Promise<BuildResult | void>;
    copyFiles?: string[];
}

export class BuilderUtil {
    private readonly projectRoot: string;
    private readonly fromDir: string;
    private readonly toDir: string;
    private readonly buildFct: () => Promise<BuildResult | void>;

    private readonly copyFiles: CopyFromTo[] = [];

    constructor(opts: BuilderOpt) {
        this.projectRoot = path.resolve(opts.projectRoot);
        this.fromDir = path.resolve(opts.fromDir);
        this.toDir = path.resolve(opts.toDir);
        this.buildFct = opts.buildFct;

        const fls = isType(opts.copyFiles, 'string') ? [opts.copyFiles] : opts.copyFiles || [];

        fls.forEach((fl) =>
            this.copyFiles.push({ from: join(this.fromDir, fl), to: join(this.toDir, fl) }));
    }

    private resolver: (val: 'bounce' | 'built') => void = (_) => void(0);
    private buildTimeoutId: NodeJS.Timeout | undefined;
    buildDebounce(logTime = true) {
        clearTimeout(this.buildTimeoutId as unknown as number);
        this.resolver('bounce');

        this.buildTimeoutId = setTimeout(async () => {
            const res = this.resolver;
            await this.build({ logTime });

            res('built');
        }, 500);

        return new Promise<'bounce' | 'built'>((res) => this.resolver = res);
    }

    async build(opts: { logTime?: boolean } = {}) {
        const { logTime = true } = opts;

        const logger = logTime && buildLogStart({ from: this.fromDir, to: this.toDir, root: this.projectRoot });
        await this.buildFct();
        
        if (logger) logger.end();
    }

    /** cleans "toDir" */
    cleanToDir = async () => BuilderUtil.cleanDir(this.toDir);

    copy = async () => BuilderUtil.copyFileHandler(this.copyFiles);

    info = () => ({
        projectRoot: this.projectRoot,
        fromDir: this.fromDir,
        toDir: this.toDir,
        copyFiles: this.copyFiles,
    });

    watchCopyFiles = (afterCopy?: () => unknown) => {
        const files = this.copyFiles.map(({ from }) => from);
        const f = async () => {
            await this.copy();
            if (afterCopy) afterCopy();
        };

        // TODO: make this more performant by only copying changed files
        const watcher = chokidar.watch(files);
        
        const debounce = debounceTimeOut();
        watcher.once('ready', async () =>
            f().then(() => watcher.on('all', () => debounce(f, 500))));

        [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`]
        .forEach((eventType) => process.on(eventType, () => {
            watcher.close();
            process.exit();
        }));
    };

    fileCopyAction = <O extends { file: string; action: CopyAction; }>(actions: O | O[]) => {
        const arr = (isType(actions, 'array') ? actions : [actions]).map(({ file, action }) => ({
            from: file, action, to: file.replace(this.fromDir, this.toDir)
        }));

        return BuilderUtil.copyFileHandler(arr);
    };

    static async copyFileHandler<O extends (CopyFromTo & { action?: CopyAction; })>(handle: O | O[]) {
        const arr = isType(handle, 'array') ? handle : [handle];
        if (!arr.length) return;

        const promises = arr.map(async (fl) => {
            const { from, to, action = 'copy' } = fl;
            try {
                switch (action) {
                    case 'addDir':
                        await mkdir(to, { recursive: true });
                        break;
                    case 'change':
                    case 'add':
                        await copy(from, to);
                        break;
                    case 'unlinkDir':
                    case 'unlink':
                        await remove(to);
                        break;
                    case 'copy':
                        await copy(from, to);
                        break;
                    default:
                        throw new Error(`Unhandled: "${action}"`);
                }
                
                return { fail: false, file: fl };
            } catch (error) {
                return { fail: true, file: fl, error };
            }
        });

        (await Promise.all(promises)).forEach((x) => {
            if (x.fail) {
                log(chalk.red`FAILED TO [${x.file.action || 'copy'}]:\nFrom: ${x.file.from}\nTo: ${x.file.to}`);
                log(x.error);
            }
        });
    }

    static async cleanDir(dir: string) {
        await remove(dir);
        await mkdir(dir, { recursive: true });
    }
}

export function timeString(t: number) {
    if (t < 500) return `${t}ms`;
    if (t < min(1)) return (t / 1000).toFixed(1) + 's';
    const { d, h, m, s } = msToTime(t, true);
    const hours = (h || d) ? minAppend(h + d * 24, 2) + 'h ' : '';
    const mins = m ? minAppend(m, 2) + 'm ' : '';
    const secs = minAppend(s, 2) + 's';

    return hours + mins + secs;
}

export function buildLogStart(opts: {
    from: string;
    to: string;
    root: string;
}) {
    const { frames, interval: frameMs } = spinners[rand(0, spinners.length - 1)];
    const { from, to, root } = opts;
    const fromTo = `[${chalk.green(from).replace(root, '')}] ${chalk.yellow`-→`} [${chalk.green(to).replace(root, '')}]`;

    const timeStart = Date.now();
    const itv = interval((i) => {
        const t = Date.now() - timeStart;

        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`> ${frames[i % frames.length]} ${chalk.blueBright`Building`} ${(t / 1000).toFixed(2)}s: ${fromTo}`);
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

export const transpileBrowser: BrowserTranspiler = async (entryFile, toDir, opts = {}) => {
    
    const buildOpts: BuildOptions = {
        target: "es2018",
        platform: 'browser',
        entryPoints: [entryFile],
        outdir: toDir,
        define: (() => {
            /** global && window -> globalThis */
            const v: Dict<string> = {"global": "globalThis", "window": "globalThis"};
            Object.entries(opts?.envVars || {}).forEach(([k, v]) => v[k] = `"${v}"`);
            return v;
        })(),
        bundle: true,
        minify: true,
        plugins: [postCssPlugin({ plugins: [ (x: unknown) => x ] }),],
        loader: {
            '.png': 'file',
            '.svg': 'file',
            '.woff': 'file',
            '.woff2': 'file',
            '.ttf': 'file',
            '.eot': 'file',
            '.mp3': 'file',
        }
    };

    return await esbuild({
        ...buildOpts,
        ...opts.changeBuildOpts,
    });
};

export const transpileNode: NodeTranspiler = async (entryFile, outFile, opts = {}) => {
    const buildOpts: BuildOptions = {
        entryPoints: [entryFile],
        outfile: outFile,
        define: (() => {
            /** global && window -> globalThis */
            const v: Dict<string> = {"global": "globalThis", "window": "globalThis"};
            // Object.entries(opts?.envVars || {}).forEach(([k, v]) => v[k] = `"${v}"`);
            return v;
        })(),
        target: 'node14',
        platform: 'node',
        bundle: true,
        sourcemap: true,
        preserveSymlinks: true,
        // plugins: [esbuildDecorators({ tsconfig: './tsconfig.json' }),],
    };

    return await esbuild({
        ...buildOpts,
        ...opts.changeBuildOpts,
    });
};

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

export class ProcessManager {
    private app: ChildProcessWithoutNullStreams;
    private appStartTime = 0;

    constructor(
        private readonly command: string,
        private readonly args?: string[],
    ) {
        this.app = this.spawnChild();
    }

    reload = async () => {
        await this.kill();
        this.app = this.spawnChild();
    };

    kill = () => new Promise<void>(res => {
        const isRunning = isType(this.app.exitCode, 'null');
        
        const finalize = () => {
            this.app.removeAllListeners();
            this.app.unref();
            res(void(0));
        };

        if (isRunning) {
            this.app.once('exit', finalize);
            this.app.kill();
        } else {
            finalize();
        }
    });

    private spawnChild = () => {
        const app = spawn(this.command, this.args || []);
        app.stdout.pipe(process.stdout);
        app.stderr.pipe(process.stderr);

        app.on('spawn', () => this.appStartTime = Date.now());
        app.on('exit', (_, signal) => {
            const time = chalk.yellow(timeString(Date.now() - this.appStartTime));
            log(`> ${chalk.green('Nodejs')}: | time: ${time} | exit: ${chalk.blue(signal)} |`);
            this.kill();
        });

        return app;
    };
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

export async function waitForFSWatchersReady(watchers: (undefined | null | false | chokidar.FSWatcher)[]) {
    const arr = watchers.filter(x => x) as chokidar.FSWatcher[];
    const n = arr.length;
    if (!n) return;

    let i = 0;

    await (new Promise((res) =>
        arr.forEach(w => w.once('ready', () => (++i === n) && res(0)))));
}

export async function filesAndDirs(files: string[]) {
    const fls: string[] = [];
    const dirs: string[] = [];

    const p = files.map(async fl =>
        (await lstat(fl)).isDirectory() ? dirs.push(fl) : fls.push(fl));

    await Promise.all(p);
    return [fls, dirs];
}