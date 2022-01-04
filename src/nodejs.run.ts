import path, { dirname, resolve } from 'path';
import chokidar from 'chokidar';
import { filesAndDirs, genWatchPaths, nodeFlags, onProcessEnd, ProcessManager, waitForFSWatchersReady } from './general.utils';

export async function runNodejs(opts: {
    /** Entry file of node .js or .ts file. */
    entryFile: string;
    /** Arguments to pass on to Node */
    nodeArgs?: string[];
    /** List of files & directories to watch, if this is not specified the directory that
     * `entryFile` belongs to will be used. */
    watchDirs?: string[];
    /** List of file extensions to watch. Default: `['ts', 'js', 'json']` */
    exts?: string[];
    /** This will run the file only once (disabling watch mode). */
    runOnce?: boolean;
}) {
    const { exts = ['ts', 'js', 'json'], nodeArgs = [], runOnce } = opts;
    const entryFile = path.resolve(opts.entryFile);
    const watch = (opts.watchDirs || [dirname(entryFile)]).map(fl => resolve(fl));
    const [watchFiles, watchDirs] = await filesAndDirs(watch);

    onProcessEnd(() => {
        app.kill();
        watcher?.close();
    });

    const args = [...nodeFlags.register, entryFile, ...nodeArgs];
    const app = new ProcessManager('node', args);

    const jsWatch = genWatchPaths(watchDirs, exts);

    let watcher: chokidar.FSWatcher | undefined;
    if (!runOnce) {
        watcher = chokidar.watch([...jsWatch, ...watchFiles]);
        await waitForFSWatchersReady([watcher]);
        watcher.on('all', app.reload);
    }
}

/**
 * This allows to simply run nodejs typescript files without a compilation step
 */