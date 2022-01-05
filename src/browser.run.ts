// import { isType, equalAny, Dict, objKeys, arrToBoolDict, objVals, debounceTimeOut } from "@giveback007/util-lib";
// import browserSync from "browser-sync";
// import { log } from "console";
// import { pathExists, readFile } from "fs-extra";
// import path, { basename, extname, join } from 'path';
// import { dirname } from "path/posix";
// import { makeJoinFct, logAndExit, arrEnsure, genWatchPaths, BuilderUtil2, logCl, logAndThrow, WatchHandlerOpts, onProcessEnd } from "./general.utils";
// import { parse as parseHTML, valid } from 'node-html-parser';
// import type { BrowserSyncInstance } from "browser-sync";

// /** Allow you to run a browser project straight from an .html entry file.
//  * 
//  */
// export async function browserRun(opts: {
//     /** Entry file of an .html file. */
//     entry: string;// | string[];

//     /** Files & directories to watch, by default uses parent directories of
//      * each .html in `entry`. Same as: `["*entry"]`
//      * 
//      * When using this option parent dir of `entry` will NOT be watched if not specified.
//      * 
//      * To auto include parent dirs of `entry` add: `"*entry"`. Eg: `["*entry", "./common"]`
//      */
//     watchDirs?: string[];

//     /** Files and directories to copy into toDir.
//      * 
//      * Eg: `['public', 'index.html']` ->
//      * 
//      * `"public"` will copy `<rootDir>/public"` into `<toDir>/public` & all contents.
//      * 
//      * `"index.html"` will copy `<rootDir>/index.html` into `<toDir>/index.html`.
//      * 
//      * Default: will use (if exists) `./public` folder of entry files parent dir.
//      * Eg: if entry: ["src/index.html"] -> (then copy:) "src/public"
//      */
//     copyFiles?: string[];

//     /** List of file extensions to watch. Default: `['ts', 'js', 'json']` */
//     exts?: string[];

//     /** This will run the file only once (disabling watch mode). */
//     runOnce?: boolean;

//     /** List of css extensions to watch for changes. This will only build css files and hot-reload
//      * them without refreshing the browser.
//      * 
//      * Default: `['sass', 'scss', 'css']`. Specifying this replaces the defaults completely.
//      */
//     cssExts?: string[];

//     /** Localhost port for dev server. Eg `3000` -> `http://localhost:3000/`
//      * 
//      * Default: `3000`.
//      */
//     port?: number;

//     /** Default: `"./"` */
//     rootDir?: string,

//     /** Out directory relative to `projectRoot`. Eg: `"./dist" or "dist"`.
//      * 
//      * Resolution order: [rootDir + toDir]
//      * 
//      * If not specified a random dir will be created `<rootDir>/.temp/<rand-dir>`
//      */
//     toDir?: string;

//     /** Restrict the frequency of build events.
//      * 
//      * Will wait `debounceMs` of milliseconds after last file save before starting to build.
//      * 
//      * Default: `300`
//      */
//     debounceMs?: number;

//     /** Options for adding environment variables */
//     env?: {
//         /** .env files to add */
//         files?: string[];
//         /** can define variables here: eg: { isDev: true } -> globalThis.isDev === true */
//         define?: Dict<string | boolean>; 
//     }

//     /** List of js/ts/etc.. extensions to watch for changes. This will build and reload the browser.
//      * 
//      * Default: `['tsx', 'ts', 'js', 'jsx', 'json']`. Specifying this replaces the defaults completely.
//      */
//     jsExts?: string[];
// }) {
//     // clearing and canceling on exit //
//     onProcessEnd(() => {
//         bs?.pause();
//         bs?.cleanup();
//         bs?.exit();
//         process.exit();
//     });

//     // Create browserSync //
//     const bs = browserSync.create('Browser-Playground');

//     const {
//         port = 3000, debounceMs = 300, env, copyFiles,
//         cssExts = ['sass', 'scss', 'css'],
//         jsExts = ['tsx', 'ts', 'js', 'jsx', 'json'],
//     } = opts;
    
//     const rootDir = path.resolve(opts.rootDir || './');
//     const joinRoot = makeJoinFct(rootDir);

//     /*
//      * Originally was going to allow multiple entries. (Still may in the future).
//      * That's why this logic is using array.
//      */

//     // Resolve and check all entries for errors
//     const entries = joinRoot(arrEnsure(opts.entry));
//     if (!entries.length) logAndExit('No entry file was given');

//     const entryErrors = (await Promise.all(entries.map(async fl => {
//         if (!await pathExists(fl)) return `File to path does not exit: ${fl}`;
//         if (extname(fl) !== '.html') return `File: ${basename(fl)} needs to be ".html"`;
//         return false;
//     }))).filter(x => x) as string[];

//     if (entryErrors.length) {
//         entryErrors.map(err => log(err));
//         logAndExit('Fix above errors before proceeding');
//     }
    
//     // Get a list of watchDirs
//     const watchDirs = ((arr: string[]) => {
//         const useEntryIdx = arr.indexOf("*entry");
//         const dict: Dict<boolean> = arrToBoolDict(arr);
//         if (useEntryIdx !== -1) {
//             delete dict['*entry'];
//             entries.forEach(en => dict[dirname(en)] = true);
//         }

//         // Filter out directories that already have their parent being watched
//         objKeys(dict).forEach(checkIfParent => objKeys(dict).forEach(dir => {
//             // if dir being compared contains `checkIfParent` as str then is parent
//             const hasParent = dir.includes(checkIfParent);
//             if (hasParent) delete dict[dir];
//         }));
        
//         return objKeys(dict);
//     })(opts.watchDirs || ["*entry"]);

//     /*
//      * Watch the dirs now, and if err don't exit just reload on changed
//      */

//     const entryWatch = { name: 'entry', path: entries };
//     // 1. every time entry changes need to check for if files changed
//     // 2. handle throw errors in watch handler


//     // const jsWatch = { name: 'js', path: genWatchPaths(watchDirs, jsExts) };
//     // const cssWatch = { name: 'css', path: genWatchPaths(watchDirs, cssExts) };
//     // const copyWatch = copyFiles ?
//     //     { name: 'copy', path: joinRoot(copyFiles) }
//     //     :
//     //     { name: '*copy-public', path: join(dirname(entries[0])) };

//     const watch: Dict<string | string[] | null> = {
//         entry: entries,
//         js: genWatchPaths(watchDirs, jsExts),
//         css: genWatchPaths(watchDirs, cssExts),
//         copy: copyFiles || null,
//         $public: copyFiles ? null : join(dirname(entries[0]), 'public'),
//     }

//     new BuilderUtil2(watch, watchHandlerInit(bs));

//     // go trough entries for the first time to make sure all is valid
//     await Promise.all(entries.map(en => onHtml(en)));

//     // conditionally rand
//     const toDir = opts.toDir;


//     // handle:
//         // if has no entry inside .html files
//         // if has multiple entry inside of .html
//         // if has tag attached to non script file
    
      
//     // TODO:
//     // clean toDir on exit (if randomly assigned)
//     // docs: about adding entry into html for js & css
//     // docs: css can be imported using html or js, if done trough js will compile into single index.css file

//     // reload html on: copy|js|html|env
// }

// const watchHandlerInit = (bs: BrowserSyncInstance) => ({ name, file, action }: WatchHandlerOpts) => {
//     const debounce = debounceTimeOut();
// }

// async function onHtml(entry: string) {
//     const dir = dirname(entry);
//     const html = await readFile(entry, 'utf8');
//     if (!valid(html)) logAndThrow(`HTML in: ${entry} is invalid html`);

//     // get css <link> & js <script> elements
//     const css = parseHTML(html).querySelectorAll('[build-dev-css]') as unknown as HTMLLinkElement[];
//     const js = parseHTML(html).querySelectorAll('[build-dev-js]') as unknown as HTMLScriptElement[];
//     if (!js.length) logCl(`${entry}: No script tags with attribute: [build-dev-js]`)

//     const cssPaths: string[] = [];
//     const jsPaths: string[] = [];
    
//     // test each one for errors
//     for (const elm of css) {
//         if (elm.tagName !== 'LINK') logAndThrow(`${elm.toString()} Must be a LINK element`);
//         if (elm.rel !== 'stylesheet') logAndThrow(`${elm.toString()} Must have 'rel=stylesheet`);
//         if (!elm.href) logAndThrow(`${elm.toString()} Needs href to link to a stylesheet`);
//         if (!equalAny(extname(elm.href), ['.css', '.scss', '.sass']))
//             logAndThrow(`For: ${elm.toString()} ${elm.href} needs to link to a ".css", ".scss", or ".sass" file`);

//         const filePath = path.resolve(join(dir, elm.href));
//         if (!(await pathExists(filePath))) logAndThrow(`For: ${elm.toString()}; no file: ${filePath}`);

//         cssPaths.push(filePath);
//     }

//     for (const elm of js) {
//         if (elm.tagName !== 'SCRIPT') logAndThrow(`${elm.toString()} Must be a SCRIPT element`);
//         if (!elm.src) logAndThrow(`${elm.toString()} Needs "src" entry defined`);
//         if (!equalAny(extname(elm.src), ['.js', '.ts', '.jsx', '.tsx']))
//             logAndThrow(`For: ${elm.toString()} ${elm.src} needs to link to a '.js', '.ts', '.jsx', or '.tsx' file`);

//         const filePath = path.resolve(join(dir, elm.src));
//         if (!(await pathExists(filePath))) logAndThrow(`For: ${elm.toString()}; no file: ${filePath}`);

//         jsPaths.push(filePath);
//     }
// }