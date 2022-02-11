import { debounceTimeOut, Dict, isType, objKeyVals, objVals } from '@giveback007/util-lib';
import type { BuildResult } from 'esbuild';
import { copy, ensureDir, existsSync, lstat, mkdir, readdirSync, remove } from 'fs-extra';
import path, { join, resolve } from 'path';
import type { WatchEvent } from './watcher.util';
import chokidar, { FSWatcher } from 'chokidar';
import chalk from 'chalk';
import { buildLogStart, onProcessEnd, waitForFSWatchersReady } from './general.utils';

const { log } = console;


type CopyFromTo = { from: string; to: string; };

export type BuilderOpt = {
    projectRoot: string;
    fromDir: string;
    toDir: string;
    buildFct: () => Promise<BuildResult | void>;
    copyFiles?: string[];
    watchHandler?: (opts: { name: string; file: string; action: WatchEvent }) => unknown; 
}

export class BuilderUtil {
    private readonly projectRoot: string;
    private readonly fromDir: string;
    private readonly toDir: string;
    private readonly buildFct: () => Promise<BuildResult | void>;
    private readonly watchers: Dict<chokidar.FSWatcher> = {};
    private readonly watchHandler: BuilderOpt['watchHandler'];

    private readonly copyFiles: CopyFromTo[] = [];

    constructor(opts: BuilderOpt) {
        // onProcessEnd(() =>
        //     objVals(this.watchers).forEach(w => w?.close()));

        this.projectRoot = path.resolve(opts.projectRoot);
        this.fromDir = path.resolve(opts.fromDir);
        this.toDir = path.resolve(opts.toDir);
        this.buildFct = opts.buildFct;

        const fls = isType(opts.copyFiles, 'string') ? [opts.copyFiles] : opts.copyFiles || [];

        fls.forEach((fl) =>
            this.copyFiles.push({ from: join(this.fromDir, fl), to: join(this.toDir, fl) }));
    }

    addWatcher(name: string, paths: string[] | string) {
        if (this.watchers[name]) throw Error(`name: "${name}" already exists`);
        const watcher = chokidar.watch(paths);

        if (this.watchersInitialized && this.watchHandler) {
            const f = this.watchHandler;
            watcher.on('all', (action, file) => f({ name, action, file }));
        }

        return this.watchers[name] = watcher;
    }

    private watchersInitialized = false;
    async initWatchers() {
        if (this.watchersInitialized) return;

        const watchers = objKeyVals(this.watchers);
        await waitForFSWatchersReady(watchers.map(({ val }) => val));

        if (this.watchHandler) {
            const f = this.watchHandler;
            watchers.forEach(({ key: name, val: w }) => w.on('all', (action, file) => f({ name, action, file })));
        }
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

    fileCopyAction = <O extends { file: string; action: WatchEvent; }>(actions: O | O[]) => {
        const arr = (isType(actions, 'array') ? actions : [actions]).map(({ file, action }) => ({
            from: file, action, to: file.replace(this.fromDir, this.toDir)
        }));

        return BuilderUtil.copyFileHandler(arr);
    };



    static async copyFileHandler<O extends (CopyFromTo & { action?: WatchEvent; })>(handle: O | O[]) {
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