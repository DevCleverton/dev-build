import type { DevBuildOptions } from './general.types';
import chokidar from 'chokidar';
import path, { join, resolve } from 'path';
import { debounceTimeOut, isType } from '@giveback007/util-lib';
import { buildLogStart, genWatchPaths, onProcessEnd, waitForFSWatchersReady } from './utils/general.utils';
import { BuilderUtil } from './utils/builder.utils';
import { transpileNode } from './utils/transpile.util';
import type { WatchEvent } from './utils/watcher.util';
import { ChildProcessManager, nodeFlags } from './utils/child-process.util';

export async function devNodejs(opts: DevBuildOptions & {
    /** List of js/ts/etc.. extensions to watch for changes. This will build and reload the browser.
     * 
     * Default: `['ts', 'js', 'json']`. Specifying this replaces the defaults completely.
     */
    exts?: string[];

    /** Arguments to pass on to Node */
    nodeArgs?: string[];
}) {
    const { nodeArgs = [] } = opts;
    const projectRoot = path.resolve(opts.projectRoot || './');
    const fromDir = join(projectRoot, opts.fromDir); // 'playground/nodejs'
    const entryFile = join(fromDir, opts.entryFile); // 'server.ts'
    const toDir = join(projectRoot, opts.toDir); // '.temp/nodejs'
    const watchOtherDirs = (opts.watchOtherDirs || []).map(dir => join(projectRoot, dir)); // 'src'
    const copyFiles = (opts.copyFiles || []);
    const jsExts = opts.exts || ['ts', 'js', 'json'];
    const debounceMs = isType(opts.debounceMs, 'number') ? opts.debounceMs : 200;
    const outFile = entryFile.replace(fromDir, toDir).replace('.ts', '.js');

    // clearing and canceling on exit //
    onProcessEnd(() => {
        copyWatcher && copyWatcher.close();
        jsWatcher.close();
        process.exit();
    });

    // initialized builder //
    const builder = new BuilderUtil({
        fromDir, toDir, projectRoot, copyFiles,
        buildFct: () => transpileNode(entryFile, outFile, { changeBuildOpts: { incremental: true } })
    });

    // Setup watchers //
    const allWatchDirs = [fromDir, ...watchOtherDirs.map(dir => resolve(dir))];
    const copyWatch = !!copyFiles.length && builder.info().copyFiles.map(x => x.from);
    const fileWatch = genWatchPaths(allWatchDirs, jsExts);

    const jsWatcher = chokidar.watch(fileWatch);
    const copyWatcher = copyWatch && chokidar.watch(copyWatch);

    let copyChanged: { file: string; action: WatchEvent; }[] = [];
    let jsChanged = false;
    const debounce = debounceTimeOut();
    const watchHandler = (opts: { type: 'js' } | { type: 'copy', file: { file: string; action: WatchEvent; } }) => {
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
            app.reload();
        }, debounceMs);
    };

    // wait for both watchers to be ready
    await waitForFSWatchersReady([copyWatcher, jsWatcher]);

    await builder.cleanToDir();
    await builder.build();
    await builder.copy();
    
    const app = new ChildProcessManager('node', [...nodeFlags.regular, outFile, ...nodeArgs]);
    
    jsWatcher.on('all', () => {
        watchHandler({ type: 'js' });
    });

    if (copyWatcher) copyWatcher.on('all', async (action, file) => {
        watchHandler({ type: 'copy', file: { file, action } });
    });
}
