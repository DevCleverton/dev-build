import type { DevBuildOptions } from "./general.types";
import browserSync from "browser-sync";
import historyApiFallback from 'connect-history-api-fallback';
import path, { join } from 'path';
import { debounceTimeOut, Dict, objKeyVals } from '@giveback007/util-lib';
import { BuilderUtil, network, onProcessEnd, transpileBrowser, genWatchPaths, configEnv, makeJoinFct, arrEnsure, logAndExit } from './general.utils';
import chalk from 'chalk';

const { log } = console;

export async function devBrowser(opts: DevBuildOptions & {
    /** List of js/ts/etc.. extensions to watch for changes. This will build and reload the browser.
     * 
     * Default: `['tsx', 'ts', 'js', 'jsx', 'json']`. Specifying this replaces the defaults completely.
     */
    jsExts?: string[];
    /** List of css extensions to watch for changes. This will only build css files and hot-reload
     * them without refreshing the browser.
     * 
     * Default: `['sass', 'scss', 'css']`. Specifying this replaces the defaults completely.
     */
    cssExts?: string[];
    /** Localhost port for dev server. Eg `3000` -> `http://localhost:3000/`
     * 
     * Default: `3000`.
     */
    port?: number;

    /** Options for adding environment variables */
    env?: {
        /** .env files to add */
        envFile?: string | string[];
        /** can define variables here: eg: { isDev: true } -> globalThis.isDev === true */
        define?: Dict<string | boolean | number>; 
    }
}) {
    log('STARTING BUILDER...');
    const {
        port = 3000, debounceMs = 350,
        cssExts = ['sass', 'scss', 'css'],
        jsExts = ['tsx', 'ts', 'js', 'jsx', 'json'],
        copyFiles = [], env,
    } = opts;
    
    const projectRoot = path.resolve(opts.projectRoot || './');
    const joinRoot = makeJoinFct(projectRoot);
    
    const fromDir = joinRoot(opts.fromDir);
    const entryFile = join(fromDir, opts.entryFile);
    const toDir = joinRoot(opts.toDir);
    const watchOtherDirs = joinRoot(opts.watchOtherDirs || []);

    // clearing and canceling on exit //
    onProcessEnd(() => {
        bs?.pause();
        bs?.cleanup();
        bs?.exit();
        process.exit();
    });

    const envVars: Dict<string | boolean | number> = {};
    if (env) {
        const { define = {}, envFile = [] } = env;
        
        arrEnsure(envFile).forEach(fl => {
            const fileVars = configEnv(joinRoot(fl));
            if (!fileVars) logAndExit('Env file errors.');

            objKeyVals(fileVars as Dict<string>).map(({ key, val }) =>
                envVars[key] = val === 'true' || val === 'false' ? val : `"${val}"`
            );
        });
        
        objKeyVals(define)
            .map(({ key, val }) => envVars[key] = val);
    }

    // initialized builder //
    const builder = new BuilderUtil({
        fromDir, toDir, projectRoot, copyFiles,
        buildFct: () => transpileBrowser(entryFile, toDir, { changeBuildOpts: { incremental: true }, envVars })
    });

    // Create browserSync //
    const bs = browserSync.create('Browser-Playground');

    // Setup watchers //
    const allWatchDirs = [fromDir, ...watchOtherDirs];
    const jsWatch = genWatchPaths(allWatchDirs, jsExts);
    const cssWatch = genWatchPaths(allWatchDirs, cssExts);

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
                log(chalk.red`Failed to Reload...`);
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
