import { ensureDir } from 'fs-extra';
import path, { join } from 'path';
import { ensureStarterFiles } from './utils/general.utils';
import { devBrowser } from './browser.dev';

/** Playground for quickly spinning up new ideas without the overhead of the whole project. */
export async function browserPlay(opts: {
    /** Default: `"./"` */
    rootDir?: string,
    /** Default: `"playground/web"` */
    playgroundDir?: string,
    /** Be careful this dir gets cleaned out on start. Default: `".temp/web"` */
    outCacheDir?: string,
    /** Default: `"index.tsx"` */
    entryFile?: string,
    /** Default: `['index.html', 'fav.ico']` */
    copyFiles?: string[],
    /** Default: `3333` */
    port?: number,
    /** Playground will create some starter files to speed things up, if you want to specify
     * a different set of starter files you can point to a directory that will be copied from.
     * Eg: `"./playground-init"`.
     */
    starterFilesDir?: string,
    /** Other dirs that on change should trigger a build. */
    watchOtherDirs?: string[],
    /** Setting this to true will delete all files in `playgroundDir` and replace with new starter files. */
    overwrite?: boolean,
} = { }) {
    const { playgroundDir: fromDir = "playground/web", overwrite = false } = opts;
    const root = path.resolve(opts.rootDir || './');
    const starterFilesDir = opts.starterFilesDir ? join(root, opts.starterFilesDir) : join(__dirname, 'assets/browser');

    await ensureStarterFiles({ root, fromDir, starterFilesDir, overwrite });
    await ensureDir(join(root, opts.outCacheDir || ".temp/web"));

    await devBrowser({
        projectRoot: opts.rootDir,
        fromDir,
        entryFile: opts.entryFile || 'index.tsx',
        toDir: opts.outCacheDir || '.temp/browser-playground',
        port: opts.port || 3333,
        copyFiles: opts.copyFiles || ['index.html', 'public'],
        watchOtherDirs: opts.watchOtherDirs,
    });
}
