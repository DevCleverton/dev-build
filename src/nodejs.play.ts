import { ensureDir } from "fs-extra";
import path, { join } from "path";
import { devBuildNodejs as devBuildNodeJs } from "./nodejs.dev";
import { ensureStarterFiles } from "./utils";

export async function nodejsPlay(opts: {
    /** Default: `"./"` */
    rootDir?: string,
    /** Default: `"playground/node"` */
    playgroundDir?: string,
    /** Be careful this dir gets cleaned out on start. Default: `".temp/node"` */
    outCacheDir?: string,
    /** Default: `"server.ts"` */
    entryFile?: string,
    /** Default: `[]` */
    copyFiles?: string[],
    /** Playground will create some starter files to speed things up, if you want to specify
     * a different set of starter files you can point to a directory that will be copied from.
     * Eg: `"./playground-init"`.
     */
     starterFilesDir?: string,
     /** Other dirs that on change should trigger a build. */
    watchOtherDirs?: string[],
} = { }) {
    const root = path.resolve(opts.rootDir || './');
    const fromDir = opts.playgroundDir || "playground/node";
    const starterFilesDir = opts.starterFilesDir ? join(root, opts.starterFilesDir) : join(__dirname, 'assets/nodejs');

    await ensureStarterFiles({ root, fromDir, starterFilesDir });
    await ensureDir(join(root, opts.outCacheDir || ".temp/node"));

    await devBuildNodeJs({
        projectRoot: opts.rootDir,
        fromDir,
        entryFile: opts.entryFile || 'server.ts',
        toDir: opts.outCacheDir || '.temp/node',
        copyFiles: opts.copyFiles,
        watchOtherDirs: opts.watchOtherDirs,
    });
}
