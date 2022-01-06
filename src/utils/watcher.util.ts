import { Dict, isType, objKeys, objKeyVals, objVals } from "@giveback007/util-lib";
import chokidar, { FSWatcher } from 'chokidar';
import { arrEnsure, onProcessEnd, waitForFSWatchersReady } from "./general.utils";

export type WatchEvent = 'add'|'addDir'|'change'|'unlink'|'unlinkDir'|'copy';
export type WatchHandlerOpts = { name: string; file: string; action: WatchEvent };
export type WatchHandler = (opts: WatchHandlerOpts) => unknown;
export type WatchInit = { name: string; paths: string | string[] }[] | Dict<string | string[] | null>;

export class FileWatchUtil {
    private watchers: Dict<FSWatcher> = {};
    private watchHandler?: WatchHandler;
    private onWatchersReady?: () => unknown | Promise<unknown>;
    private watchersInitData?: WatchInit;

    constructor(
        addWatchers?: WatchInit,
        watchHandler?: WatchHandler,
        onWatchersReady?: () => unknown,
    ) {
        onProcessEnd(() => objVals(this.watchers).forEach(w => w?.close()));

        this.watchHandler = watchHandler;
        this.onWatchersReady = onWatchersReady;
        this.watchersInitData = addWatchers;
        if (addWatchers) this.initWatchers({ addWatchers, watchHandler, onWatchersReady });
    }
    
    async addWatcher(name: string, paths: string[] | string) {
        if (this.watchers[name]) throw Error(`name: "${name}" already exists`);

        return this.watchers[name] = chokidar.watch(paths);
    }

    async removeWatchers(names: string | string[]) {
        const p = arrEnsure(names).map(async nm => {
            await this.watchers[nm]?.close();
            delete this.watchers[nm];
        })
        
        await Promise.all(p);
        return true;
    }
    
    async initWatchers(opts: {
        addWatchers?: WatchInit,
        watchHandler?: WatchHandler,
        onWatchersReady?: () => unknown,
    }): Promise<true> {
        const { addWatchers, watchHandler, onWatchersReady } = opts;

        // return;
        await this.removeWatchers(objKeys(this.watchers));
        if (addWatchers || this.watchersInitData) {
            const addW = this.watchersInitData = addWatchers || this.watchersInitData as WatchInit;
            const arr = isType(addW, 'array') ?
                addW : objKeyVals(addW).map(o => ({ name: o.key, paths: o.val }));

            const p = arr.map(({ name, paths }) => !isType(paths, 'null') && this.addWatcher(name, paths));
            await Promise.all(p);
        }

        const watchers = Object.entries(this.watchers);
        await waitForFSWatchersReady(watchers.map(([, w]) => w));
        // Watch handlers
        if (watchHandler || this.watchHandler) {
            const fct = this.watchHandler = watchHandler || this.watchHandler as WatchHandler;
            watchers.forEach(([name, w]) => w.on('all', (action, file) => fct({ name, action, file })));
        }

        // Code to run when all watchers are initialized
        if (onWatchersReady || this.onWatchersReady) {
           const fct = this.onWatchersReady = onWatchersReady || this.onWatchersReady as () => unknown;
           fct(); 
        }

        return true;
    }
}