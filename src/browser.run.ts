import type { RunBrowserOpts } from "./general.types";
import type { Dict } from "@giveback007/util-lib";
import browserSync from "browser-sync";
import { prepRunBrowserPaths, runBrowserWatchHandlerInit } from "./utils/browser-run.util";
import { makeJoinFct, onProcessEnd, genWatchPaths } from "./utils/general.utils";
import { dirname, join } from 'path';
import { FileWatchUtil } from "./utils/watcher.util";

const { log } = console;

/** Allow you to run a browser project straight from an .html entry file.
 * 
 */
export async function runBrowser(opts: RunBrowserOpts) {
    // clearing and canceling on exit //
    onProcessEnd(() => {
        bs?.pause();
        bs?.cleanup();
        bs?.exit();
        process.exit();
    });

    // Create browserSync //
    const bs = browserSync.create('Browser-Run');

    const {
        port = 3000, debounceMs = 300, env, copyFiles,
        rootDir, entryHTML, watchDirs,
        cssExts = ['sass', 'scss', 'css'],
        jsExts = ['tsx', 'ts', 'js', 'jsx', 'json'],
    } = await prepRunBrowserPaths(opts);
    
    const joinRoot = makeJoinFct(rootDir);

    /*
     * Originally was going to allow multiple entries. (Still may in the future).
     * That's why this logic is using array.
     */

    // 1. every time entry changes need to check for if files changed
    // 2. handle throw errors in watch handler

    // TODO check what happens when no public folder
    // TODO test with multiple css and js entries
    const watch: Dict<string | string[] | null> = {
        entry: entryHTML,
        js: genWatchPaths(watchDirs, jsExts),
        css: genWatchPaths(watchDirs, cssExts),
        copy: copyFiles || null,
        '*public': copyFiles ? null : join(dirname(entryHTML[0]), 'public'),
    }

    const watchHandler = runBrowserWatchHandlerInit({
        bs, debounceMs, root: rootDir, from: dirname(entryHTML[0]), to: '???'
    });

    const onReady = async () => {
        log('READY!');
        // const arr = await Promise.all(entries.map(en => onHtml(en)));
        // const { jsPaths, cssPaths } = await onHtml(entries[0]);
        // now that I have the paths I need to use this as a means to build
        // on entry will generate all the js and css paths, as well as it should normalize those nodes

    }

    const builder = new FileWatchUtil(watch, watchHandler, onReady);
    // onHtml(entries[0])
    
    // i want to await watcher so this way I know I can start listening?
    

    // go trough entries for the first time to make sure all is valid
    // x //?
    // conditionally rand
    const toDir = opts.toDir;


    // handle:
        // if has no entry inside .html files
        // if has multiple entry inside of .html
        // if has tag attached to non script file
    
      
    // TODO:
    // clean toDir on exit (if randomly assigned)
    // docs: about adding entry into html for js & css
    // docs: css can be imported using html or js, if done trough js will compile into single index.css file

    // reload html on: copy|js|html|env
}







// runBrowser({ entryHTML: 'src/assets/browser/index.html' })//.catch((err) => log(err));


// process.on('uncaughtException')