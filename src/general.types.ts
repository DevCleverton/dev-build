import type { Dict } from "@giveback007/util-lib"

export type DevBuildOptions = {
    /** Directory of entry file relative to `projectRoot`. Eg: `"./src" or "src"`.
     * 
     * Resolution order: [projectRoot + fromDir + entryFile]
     */
    fromDir: string;
    /** Entry file relative to `fromDir`. Eg: `"index.tsx"`.
     * 
     * Resolution order: [projectRoot + fromDir + entryFile]
     */
    entryFile: string;
    /** Out directory relative to `projectRoot`. Eg: `"./dist" or "dist"`.
     * 
     * Resolution order: [projectRoot + toDir]
     */
    toDir: string;
    /** Other dirs besides `fromDir` that on change should trigger build & browser refresh.
     * 
     * Eg: `['utils', 'common']`
     */
    watchOtherDirs?: string[];
    
    /** Relative path of project root. Eg `"./"` or `"./my-project"`
     * 
     * Default: `'./'`
     */
    projectRoot?: string;
    /** Files and directories to copy into toDir.
     * 
     * Eg: `['public', 'index.html']` ->
     * 
     * `"public"` will copy `<fromDir>/public"` into `<toDir>/public` as well as all the dirs contents and subdirectories.
     * 
     * `"index.html"` will copy `<fromDir>/index.html` into `<toDir>/index.html`.
     */
    copyFiles?: string[];
    /** Restrict the frequency of build events.
     * 
     * Will wait `debounceMs` of milliseconds after last file save before starting to build.
     * 
     * Default: `350`
     */
    debounceMs?: number;
}

export type RunBrowserOpts = {
    /** Entry file of an .html file. */
    entryHTML: string;// | string[];

    /** Files & directories to watch, by default uses parent directories of
     * each .html in `entry`. Same as: `["*entry"]`
     * 
     * When using this option parent dir of `entry` will NOT be watched if not specified.
     * 
     * To auto include parent dirs of `entry` add: `"*entry"`. Eg: `["*entry", "./common"]`
     */
    watchDirs?: string[];

    /** Files and directories to copy into toDir.
     * 
     * Eg: `['public', 'index.html']` ->
     * 
     * `"public"` will copy `<rootDir>/public"` into `<toDir>/public` & all contents.
     * 
     * `"index.html"` will copy `<rootDir>/index.html` into `<toDir>/index.html`.
     * 
     * Default: will use (if exists) `./public` folder of entry files parent dir.
     * Eg: if entry: ["src/index.html"] -> (then copy:) "src/public"
     */
    copyFiles?: string[];

    /** List of file extensions to watch. Default: `['ts', 'js', 'json']` */
    exts?: string[];

    /** This will run the file only once (disabling watch mode). */
    runOnce?: boolean;

    /** List of css extensions to watch for changes. This will only build css files and hot-reload
     * them without refreshing the browser.
     * 
     * Default: `['sass', 'scss', 'css']`. Specifying this replaces the defaults completely.
     */
    cssExts?: string[];

    /** Localhost port for dev server. Eg `3000` -> `http://localhost:3000/`
     * 
     * Default: `3000`.
     */
    port?: number;

    /** Default: `"./"` */
    rootDir?: string,

    /** Out directory relative to `projectRoot`. Eg: `"./dist" or "dist"`.
     * 
     * Resolution order: [rootDir + toDir]
     * 
     * If not specified a random dir will be created `<rootDir>/.temp/<rand-dir>`
     */
    toDir?: string;

    /** Restrict the frequency of build events.
     * 
     * Will wait `debounceMs` of milliseconds after last file save before starting to build.
     * 
     * Default: `300`
     */
    debounceMs?: number;

    /** Options for adding environment variables */
    env?: {
        /** .env files to add */
        files?: string[];
        /** can define variables here: eg: { isDev: true } -> globalThis.isDev === true */
        define?: Dict<string | boolean>; 
    }

    /** List of js/ts/etc.. extensions to watch for changes. This will build and reload the browser.
     * 
     * Default: `['tsx', 'ts', 'js', 'jsx', 'json']`. Specifying this replaces the defaults completely.
     */
    jsExts?: string[];
}
