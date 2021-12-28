import { existsSync } from 'fs-extra';
import path, { join } from 'path';
import { BuilderUtil } from './utils';
import { readdirSync } from "fs";
import { devBuildBrowser } from './scripts';

/** Playground for quickly spinning up new ideas without the overhead of the whole project. */
export async function browserPlayground(opts: {
    /** Default: `"./"` */
    rootDir?: string,
    /** Default: `"playground/web"` */
    playgroundDir?: string,
    /** Be careful this dir gets cleaned out on start. Default: `".temp/web"` */
    outCacheDir?: string,
    /** Default: `"'index.tsx'"` */
    entryFile?: string,
    /** Default: `['index.html', 'fav.ico']` */
    copyFiles?: string[],
    /** Default: `3333` */
    port?: number,
    /** Playground will create some starter files to speed things up, if you want to specify
     * a different set of starter files you can point to a directory that will be copied from.
     * Eg: `"./playground-init"`.
     */
    starterFilesDir?: string
} = {}) {
    const root = path.resolve(opts.rootDir || './');
    const fromDir = join(root, opts.playgroundDir || "playground/web");

    // If toDir playground doesn't exist copy playground files Prepare the playground folders with files //
    if (!existsSync(fromDir)) {    
        const startFiles = opts.starterFilesDir ? join(root, opts.starterFilesDir) : join(__dirname, 'assets/browser');
        const p = readdirSync(startFiles).map((fl) => BuilderUtil.copyFileHandler({ from: join(startFiles, fl), to: join(fromDir, fl) }));

        await Promise.all(p);
    }

    devBuildBrowser({
        projectRoot: opts.rootDir || ".",
        fromDir: opts.playgroundDir || "playground/web",
        entryFile: opts.entryFile || 'index.tsx',
        toDir: opts.outCacheDir || '.temp/web',
        port: opts.port || 3333,
        copyFiles: opts.copyFiles || ['index.html', 'fav.ico']
    });
}