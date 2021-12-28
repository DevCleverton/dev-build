import chokidar from 'chokidar';
import path, { join, resolve } from 'path';
import { debounceTimeOut, isType } from '@giveback007/util-lib';
import { BuilderUtil, buildLogStart, CopyAction, ProcessManager, transpileBrowser } from './utils';
import chalk from 'chalk';

const { log } = console;

export async function devBuildNodejs(opts: {
    fromDir: string;
    entryFile: string;
    toDir: string;
    watchOtherDirs?: string[];
    cssExts?: string[];
    jsExts?: string[];
    projectRoot?: string;
    copyFiles?: string[];
    debounceMs?: number;
}) {
    const projectRoot = path.resolve(opts.projectRoot || './');
    const fromDir = join(projectRoot, opts.fromDir); // 'playground/nodejs'
    const entryFile = join(fromDir, opts.entryFile); // 'server.ts'
    const toDir = join(projectRoot, opts.toDir); // '.temp/nodejs'
    const watchOtherDirs = (opts.watchOtherDirs || []).map(dir => join(projectRoot, dir)); // 'src'
    const copyFiles = (opts.copyFiles || []);
    const jsExts = opts.jsExts || ['ts', 'js'];
    const debounceMs = isType(opts.debounceMs, 'number') ? opts.debounceMs : 200;
    const outFile = entryFile.replace(fromDir, toDir).replace('.ts', '.js');

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

    // wait for both watchers to be ready
    await (new Promise((res) => {
        let i = copyWatcher ? 0 : 1;
        
        if (copyWatcher)
            copyWatcher.once('ready', () => (++i >= 2) && res(0));

        jsWatcher.once('ready', () => (++i >= 2) && res(0));
    }));

    await builder.cleanToDir();
    await builder.build();
    await builder.copy();
    
    const app = new ProcessManager('node', ['--enable-source-maps', outFile]);
    
    jsWatcher.on('all', () => {
        watchHandler({ type: 'js' });
    });

    if (copyWatcher) copyWatcher.on('all', async (action, file) => {
        watchHandler({ type: 'copy', file: { file, action } });
    });
}
