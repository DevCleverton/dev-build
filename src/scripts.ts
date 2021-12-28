import browserSync from "browser-sync";
import chokidar from 'chokidar';
import historyApiFallback = require('connect-history-api-fallback');
import { writeFile, existsSync, ensureDirSync } from 'fs-extra';
import path, { join, resolve } from 'path';
import { debounceTimeOut, isType } from '@giveback007/util-lib';
import { BuilderUtil, buildLogStart, CopyAction, network, ProcessManager, transpileBrowser } from './utils';
import chalk from 'chalk';

const { log } = console;

export async function devBuildBrowser(opts: {
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
    /** List of css extensions to watch for changes.
     * 
     * Default: `['sass', 'scss', 'css']`. Specifying this replaces the defaults completely.
     */
    cssExts?: string[];
    /** List of js/ts extensions to watch for changes.
     * 
     * Default: `['tsx', 'ts', 'js', 'jsx']`. Specifying this replaces the defaults completely.
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
}) {
    log('STARTING BUILDER...');

    const port = opts.port || 3000;
    const projectRoot = path.resolve(opts.projectRoot || './');
    const fromDir = join(projectRoot, opts.fromDir);
    const entryFile = join(fromDir, opts.entryFile);
    const toDir = join(projectRoot, opts.toDir);
    const watchOtherDirs = (opts.watchOtherDirs || []).map((dir) => join(projectRoot, dir));
    const jsExts = opts.jsExts || ['tsx', 'ts', 'js', 'jsx'];
    const cssExts = opts.cssExts || ['sass', 'scss', 'css'];
    const copyFiles = (opts.copyFiles || []);
    const debounceMs = isType(opts.debounceMs, 'number') ? opts.debounceMs : 200;

    // clearing and canceling on exit //
    [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`]
    .forEach((eventType) => process.on(eventType, () => {
        bs.pause();
        bs.cleanup();
        bs.exit();
        process.exit();
    }));

    // initialized builder //
    const builder = new BuilderUtil({
        fromDir, toDir, projectRoot, copyFiles,
        buildFct: () => transpileBrowser(entryFile, toDir, { changeBuildOpts: { incremental: true } })
    });

    // Create browserSync //
    const bs = browserSync.create('Browser-Playground');

    // Setup watchers //
    const allWatchDirs = [fromDir, ...watchOtherDirs.map(dir => resolve(dir))];
    const jsWatch: string[] = [];
    const cssWatch: string[] = [];

    allWatchDirs.forEach((dir) => {
        jsExts.forEach(ext =>
            jsWatch.push(path.join(dir, '**', '*.' + ext)));

        cssExts.forEach(ext =>
            cssWatch.push(path.join(dir, '**', '*.' + ext)));
    });

    let cssChanged = false;
    let jsChanged = false;
    const debounce = debounceTimeOut();
    
    const watchHandler = (type: 'css' | 'js') => {
        type === 'js' ? (jsChanged = true) : (cssChanged = true);

        debounce(async () => {
            await builder.build();

            if (jsChanged) {
                cssChanged = jsChanged = false;
                bs.reload("*.html");
            } else if (cssChanged) {
                cssChanged = false;
                bs.reload("*.css");
            } else {
                log(chalk`Failed to Reload...`);
            }
        }, debounceMs);
    };

    bs.watch(
        jsWatch as never as string,
        { ignoreInitial: true },
        () => watchHandler('js')
    );
    
    bs.watch(
        cssWatch as never as string,
        { ignoreInitial: true },
        () => watchHandler('css')
    );

    if (builder.info().copyFiles.length)
        builder.watchCopyFiles(() => bs.reload("*.html"));
        
    // Start //
    try {
        await builder.build();
    } catch {
        log(chalk.red`FAILED FIRST BUILD`);
    }


    bs.init({
        server: toDir,
        middleware: [ historyApiFallback() ],
        reloadDelay: 0,
        reloadDebounce: 100,
        reloadOnRestart: true,
        port,
        ghostMode: false,
        host: network(),
    });
}

export async function nodejsPlayGround(opts: {
    fromDir?: string;
    entryFile?: string;
    toDir?: string;
    watchOtherDirs?: string[];
    cssExts?: string[];
    jsExts?: string[];
    projectRoot?: string;
    copyFiles?: string[];
    debounceMs?: number;
    // port?: number;
} = { }) {
    const fromDir = resolve(opts.fromDir || 'playground/nodejs');
    const entryFile = join(fromDir, 'server.ts');
    const toDir = resolve(opts.toDir || '.temp/nodejs');
    const outFile = entryFile.replace(fromDir, toDir).replace('.ts', '.js');
    const watchOtherDirs = (opts.watchOtherDirs || ['src']).map((dir) => path.resolve(dir));
    const copyFiles = (opts.copyFiles || []);
    const jsExts = ['ts', 'js'];
    const projectRoot = path.resolve(opts.projectRoot || './');
    const debounceMs = isType(opts.debounceMs, 'number') ? opts.debounceMs : 200;
    
    // Prepare the playground folders with files //
    [fromDir, toDir].forEach(async dir => ensureDirSync(dir));

    Object.entries(nodejsFiles()).forEach(([fileName, txt]) => {
        if (!existsSync(join(fromDir, fileName)))
            writeFile(join(fromDir, fileName), txt);
    });

    // clearing and canceling on exit //
    [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`]
    .forEach((eventType) => process.on(eventType, () => {
        copyWatcher && copyWatcher.close();
        jsWatcher.close();
        process.exit();
    }));

    // initialized builder //
    const builder = new BuilderUtil({
        fromDir, toDir, projectRoot, copyFiles,
        buildFct: () => transpileBrowser(entryFile, toDir, { changeBuildOpts: { incremental: true } })
    });

    // Setup watchers //
    const allWatchDirs = [fromDir, ...watchOtherDirs.map(dir => resolve(dir))];
    const copyWatch = !!copyFiles.length && builder.info().copyFiles.map(x => x.from);
    const jsWatch: string[] = [];

    allWatchDirs.forEach((dir) => {
        jsExts.forEach(ext =>
            jsWatch.push(path.join(dir, '**', '*.' + ext)));
    });

    const jsWatcher = chokidar.watch(jsWatch);
    const copyWatcher = copyWatch && chokidar.watch(copyWatch);

    let copyChanged: { file: string; action: CopyAction; }[] = [];
    let jsChanged = false;
    const debounce = debounceTimeOut();
    const watchHandler = (opts: { type: 'js' } | { type: 'copy', file: { file: string; action: CopyAction; } }) => {
        switch (opts.type) {
            case 'js':
                jsChanged = true;
                break;
            case 'copy':
                copyChanged.push(opts.file);
                break;
            default:
                break;
        }
        
        debounce(async () => {
            const { fromDir: from, toDir: to, projectRoot: root } = builder.info();
            const logger = buildLogStart({ from, to, root });

            const copyFl = copyChanged;
            copyChanged = [];

            if (jsChanged) {
                await builder.build({ logTime: false });
            }
            
            if (copyFl.length) {
                await builder.fileCopyAction(copyFl);
            }
            
            logger.end();
            log(`> Restarting ${chalk.green('Nodejs')} App...`);
            app.reload();
        }, debounceMs);
    };

    await (new Promise((res) => {
        let i = copyWatcher ? 0 : 1;
        
        if (copyWatcher)
            copyWatcher.once('ready', (_) => (++i >= 2) && res(_));

        jsWatcher.once('ready', (_) => (++i >= 2) && res(_));
    }));

    await builder.cleanToDir();
    await builder.build();
    await builder.copy();
    
    const app = new ProcessManager('node', [outFile]);
    
    jsWatcher.on('all', () => {
        watchHandler({ type: 'js' });
    });

    if (copyWatcher) copyWatcher.on('all', async (action, file) => {
        watchHandler({ type: 'copy', file: { file, action } });
    });
}
