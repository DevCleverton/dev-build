// import { isType, equalAny, Dict, objKeys, arrToBoolDict, objVals } from "@giveback007/util-lib";
// import { log } from "console";
// import { pathExists, readFile } from "fs-extra";
// import path, { basename, extname, join } from 'path';
// import { dirname } from "path/posix";
// import { makeJoinFct, logAndExit, arrEnsure } from "./general.utils";
// import { parse as parseHTML } from 'node-html-parser';

// /** Allow you to run a browser project straight from an .html entry file.
//  * 
//  */
// export async function browserRun(opts: {
//     /** Entry file of an .html file. */
//     entry: string | string[];

//     /** Files & directories to watch, by default uses parent directories of
//      * each .html in `entry`. Same as: `["*entry"]`
//      * 
//      * When using this option parent dirs of `entry` will NOT be watched if not specified as well.
//      * 
//      * To include parent dirs of every `entry` add: `"*entry"`. Eg: `["*entry", "./common"]`
//      */
//     watchDirs?: string[];

//     /** Files and directories to copy into toDir.
//      * 
//      * Eg: `['public', 'index.html']` ->
//      * 
//      * `"public"` will copy `<fromDir>/public"` into `<toDir>/public` & all contents.
//      * 
//      * `"index.html"` will copy `<fromDir>/index.html` into `<toDir>/index.html`.
//      * 
//      * Default: will use (if exists) `./public` folder of the first entry files parent dir.
//      * Eg: if entry: ["src/index.html"] -> "src/public"
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
//      * Default: `350`
//      */
//     debounceMs?: number;

//     /** Options for adding environment variables */
//     env?: {
//         /** .env files to add */
//         files?: string[];
//         /** can define variables here: eg: { isDev: true } -> globalThis.isDev === true */
//         define?: Dict<string | boolean>; 
//     }
// }) {
//     const port = opts.port || 3000;
//     const debounceMs = isType(opts.debounceMs, 'number') ? opts.debounceMs : 200;
//     const rootDir = path.resolve(opts.rootDir || './');
//     const joinRoot = makeJoinFct(rootDir);

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
//             const hasParent = dir.includes(checkIfParent);
//             if (hasParent) delete dict[dir];
//         }));
        
//         return objKeys(dict);
//     })(opts.watchDirs || ["*entry"]);

//     // go trough each of the html files and parse them
//     await Promise.all(entries.map(async en => {
//         const dir = dirname(en);
//         const html = await readFile(en, 'utf8');

//         // get css <link> & js <script> elements
//         const css = parseHTML(html).querySelectorAll('[build-dev-css]') as unknown as HTMLLinkElement[];
//         const js = parseHTML(html).querySelectorAll('[build-dev-js]') as unknown as HTMLScriptElement[];

//         const cssPaths: string[] = [];
//         const jsPaths: string[] = [];
        
//         // test each one for errors
//         for (const elm of css) {
//             if (elm.tagName !== 'LINK') logAndExit(`${elm.toString()} Must be a link element`);
//             if (elm.rel !== 'stylesheet') logAndExit(`${elm.toString()} Must have 'rel=stylesheet`);
//             if (!elm.href) logAndExit(`${elm.toString()} Needs href to link to a stylesheet`);
//             if (!equalAny(extname(elm.href), ['.css', '.scss', '.sass']))
//                 logAndExit(`For: ${elm.toString()} ${elm.href} needs to link to a ".css", ".scss", or ".sass" file`);

//             const filePath = path.resolve(join(dir, elm.href));
//             if (!(await pathExists(filePath))) logAndExit(`For: ${elm.toString()}; no file: ${filePath}`);

//             cssPaths.push(filePath);
//         }

//         for (const elm of js) {
//             if (elm.tagName !== 'SCRIPT') logAndExit(`${elm.toString()} Must be a script element`);
//             if (!elm.src) logAndExit(`${elm.toString()} Needs src entry defined`);
//             if (!equalAny(extname(elm.src), ['.js', '.ts', '.jsx', '.tsx']))
//                 logAndExit(`For: ${elm.toString()} ${elm.src} needs to link to a '.js', '.ts', '.jsx', or '.tsx' file`);

//             const filePath = path.resolve(join(dir, elm.src));
//             if (!(await pathExists(filePath))) logAndExit(`For: ${elm.toString()}; no file: ${filePath}`);

//             jsPaths.push(filePath);
//         }

//         // TODO now that I have the css and js path and they are checked for errors ...
//         // I need to watch for file changes 
//     }));

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