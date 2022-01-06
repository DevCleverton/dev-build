import postCssPlugin from "esbuild-plugin-postcss2";
import { Dict, isType, objKeyVals } from "@giveback007/util-lib";
import type { BuildOptions, BuildResult } from "esbuild";
import { build as esbuild } from 'esbuild';

// export type NodeTranspiler = (files: string[], toDir: string, opts?: {changeBuildOpts?: BuildOptions}) => Promise<BuildResult>;
export type NodeTranspiler = (entryFile: string, outFile: string, opts?: {changeBuildOpts?: BuildOptions}) => Promise<BuildResult>;
export type BrowserTranspiler = (entryFile: string, toDir: string, opts?: {changeBuildOpts?: BuildOptions, envVars?: Dict<string | number | boolean>}) => Promise<BuildResult>;

function defineUtil(envVars: Dict<string | boolean | number> = {}) {
    /** global && window -> globalThis */
    const v: Dict<string> = {"global": "globalThis", "window": "globalThis"};
    objKeyVals(envVars).forEach(({ key, val }) => {
        v[key] = isType(v, 'string') ? `"${val}"` : `${val}`;
    });

    return v;
}

export const transpileBrowser: BrowserTranspiler = async (entryFile, toDir, opts = { }) => {
    const loader: Dict<'file'> = {};
    const imgExt = [".jpg",".jpeg",".jfif",".pjpeg",".pjp",".png",".svg",".webp",".gif"];
    const vidExt = ['.mp4','.webm'];
    const sndExt = ['.mp3', '.wav','.ogg'];
    const fntExt = ['.ttf','.otf','.eot','.woff','.woff2'];
    [...imgExt, ...vidExt, ...sndExt, ...fntExt].forEach(ex => loader[ex] = 'file');

    const buildOpts: BuildOptions = {
        target: "es2018",
        platform: 'browser',
        entryPoints: [entryFile],
        outdir: toDir,
        define: defineUtil(opts.envVars),
        bundle: true,
        minify: true,
        plugins: [postCssPlugin({ plugins: [ (x: unknown) => x ] }),],
        loader,
    };

    return await esbuild({
        ...buildOpts,
        ...opts.changeBuildOpts,
    });
};

export const transpileNode: NodeTranspiler = async (entryFile, outFile, opts = {}) => {
    const buildOpts: BuildOptions = {
        entryPoints: [entryFile],
        outfile: outFile,
        define: defineUtil(),
        target: 'node14',
        platform: 'node',
        bundle: true,
        sourcemap: true,
        preserveSymlinks: true,
        // plugins: [esbuildDecorators({ tsconfig: './tsconfig.json' }),],
    };

    return await esbuild({
        ...buildOpts,
        ...opts.changeBuildOpts,
    });
};