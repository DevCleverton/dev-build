import { ensureDir } from 'fs-extra';
import path, { join } from 'path';
import { ensureStarterFiles } from './utils';
import { devBuildBrowser } from './browser.dev';

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
} = { }) {
    const root = path.resolve(opts.rootDir || './');
    const fromDir = opts.playgroundDir || "playground/web";
    const starterFilesDir = opts.starterFilesDir ? join(root, opts.starterFilesDir) : join(__dirname, 'assets/browser');

    await ensureStarterFiles({ root, fromDir, starterFilesDir });
    await ensureDir(join(root, opts.outCacheDir || ".temp/web"));

    await devBuildBrowser({
        projectRoot: opts.rootDir,
        fromDir,
        entryFile: opts.entryFile || 'index.tsx',
        toDir: opts.outCacheDir || '.temp/web',
        port: opts.port || 3333,
        copyFiles: opts.copyFiles || ['index.html', 'fav.ico'],
        watchOtherDirs: opts.watchOtherDirs,
    });
}
