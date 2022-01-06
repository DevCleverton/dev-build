import type { RunBrowserOpts } from "../general.types";
import type { BrowserSyncInstance } from "browser-sync";
import { debounceTimeOut, Dict, equalAny, objKeys } from "@giveback007/util-lib";
import { pathExists, readFile } from "fs-extra";
import path, { basename, dirname, extname, join } from "path";
import { arrEnsure, changeExtension, logAndExit, logAndThrow, logCl, makeJoinFct, WatchEvent, WatchHandlerOpts } from "../general.utils";
import { valid, parse as parseHTML } from "node-html-parser";
const { log } = console;


/* -- Prep Run Browser Paths -- */
export async function prepRunBrowserPaths(opts: RunBrowserOpts) {
    const rootDir = path.resolve(opts.rootDir || './');
    const joinRoot = makeJoinFct(rootDir);

    // Resolve and check all entries for errors
    const entryHTML = joinRoot(arrEnsure(opts.entryHTML));
    if (!entryHTML.length) return logAndExit('No entry file was given');

    const entryErrors = (await Promise.all(entryHTML.map(async fl => {
        if (!await pathExists(fl)) return `File to path does not exits: ${fl}`;
        if (extname(fl) !== '.html') return `File: ${basename(fl)} needs to be ".html"`;
        return false;
    }))).filter(x => x) as string[];

    if (entryErrors.length) {
        entryErrors.map(err => log(err));
        return logAndExit('Fix above errors before proceeding');
    }

    // Get a list of watchDirs
    const watchDirs = ((arr: string[]) => {
        arr = [...arr];

        const useEntryIdx = arr.indexOf("*entry");
        const dict: Dict<boolean> = {};
        if (useEntryIdx !== -1) {
            arr.splice(useEntryIdx, 1);
            entryHTML.forEach(en => dict[dirname(en)] = true);
        }

        arr.forEach(en => dict[joinRoot(en)] = true);

        // Filter out directories that already have their parent being watched
        objKeys(dict).forEach(checkIfParent => objKeys(dict).forEach(dir => {
            // if dir being compared contains `checkIfParent` as str then is parent
            const hasParent = dir.includes(checkIfParent);
            if (checkIfParent !== dir && hasParent) delete dict[dir];
        }));
        
        return objKeys(dict);
    })(opts.watchDirs || ["*entry"]);

    return { ...opts, rootDir, entryHTML, watchDirs };
}


/* -- Run Browser Watch Handler Init -- */
type WatchHandlerInitOpts = {
    bs: BrowserSyncInstance;
    debounceMs: number;
    from: string;
    to: string;
    root: string;
}
export const runBrowserWatchHandlerInit = (opts: WatchHandlerInitOpts) => {
    const debounce = debounceTimeOut();
    const { bs, debounceMs, from, to, root } = opts;

    let copyChanges: { file: string; action: WatchEvent; }[] = [];
    let entryChanges: { file: string; }[];

    let reEntry = false, reHtml = false, reCss = false;
    return async ({ name, file, action }: WatchHandlerOpts) => {
        switch (name) {
            case 'entry':
                // when the entry changes need to get all the new css & js entry points
                    // basically need to tell the transpiler about new css and js entries
                    // also need to take the html
                reEntry = true;
                entryChanges.push({ file })
                break;
            case "js":
                reHtml = true;
                break;
            case "css":
                reCss = true;
                break;
            case "copy":
                reHtml = true;
                copyChanges.push({ file, action });
                break;
            case "*public":
                log(name, file, action); // TODO !!!!
                reHtml = true;
                break;
            default:
                logAndExit(`name: "${name}" not implemented.`);
        }

        debounce(() => {
            // first copy
            // then build
            log('build');
        }, debounceMs);
    }
}


/* -- On HTML -- */
async function onHtml(entry: string) {
    const _ = {
        jsAtt: 'build-dev-js',
        cssAtt: 'build-dev-css'
    } as const;


    const dir = dirname(entry);
    const htmlStr = await readFile(entry, 'utf8');
    if (!valid(htmlStr)) logAndThrow(`HTML in: ${entry} is invalid html`);

    // get css <link> & js <script> elements
    const html = parseHTML(htmlStr);
    const css = html.querySelectorAll(`[${_.cssAtt}]`);
    const js = html.querySelectorAll(`[${_.jsAtt}]`);
    if (!js.length) logCl(`${entry}: No script tags with attribute: [${_.jsAtt}]`)

    const cssPaths: string[] = [];
    const jsPaths: string[] = [];
    
    // tests each one for errors
    for (const elm of css) {
        const ext = extname(elm.attrs.href);

        if (elm.tagName !== 'LINK') logAndThrow(`${elm.toString()} Must be a LINK element`);
        if (elm.attrs.rel !== 'stylesheet') logAndThrow(`${elm.toString()} Must have 'rel=stylesheet`);
        if (!elm.attrs.href) logAndThrow(`${elm.toString()} Needs href to link to a stylesheet`);
        if (!equalAny(ext, ['.css', '.scss', '.sass']))
            logAndThrow(`For: ${elm.toString()} ${elm.attrs.href} needs to link to a ".css", ".scss", or ".sass" file`);

        const filePath = path.resolve(join(dir, elm.attrs.href));
        if (!(await pathExists(filePath))) logAndThrow(`For: ${elm.toString()}; no file: ${filePath}`);
        
        elm.setAttribute('href', changeExtension(elm.attrs.href, '.css'));
        elm.removeAttribute(_.cssAtt)
        cssPaths.push(filePath);
    }

    for (const elm of js) {
        const ext = extname(elm.attrs.src);

        if (elm.tagName !== 'SCRIPT') logAndThrow(`${elm.toString()} Must be a SCRIPT element`);
        if (!elm.attrs.src) logAndThrow(`${elm.toString()} Needs "src" entry defined`);
        if (!equalAny(ext, ['.js', '.ts', '.jsx', '.tsx']))
            logAndThrow(`For: ${elm.toString()} ${elm.attrs.src} needs to link to a '.js', '.ts', '.jsx', or '.tsx' file`);

        const filePath = path.resolve(join(dir, elm.attrs.src));
        if (!(await pathExists(filePath))) logAndThrow(`For: ${elm.toString()}; no file: ${filePath}`);

        elm.setAttribute('src', changeExtension(elm.attrs.src, '.js'));
        elm.removeAttribute(_.jsAtt)
        jsPaths.push(filePath);
    }

    const body = html.querySelector('body');
    if (body) body.innerHTML += /* HTML */`
        <script>
            // This is here to ensure the browser-sync is properly connected.
            setTimeout(() => {
                const src = '/browser-sync/browser-sync-client.js';

                const hasBS = Array.from(document.querySelectorAll('script'))
                    .find((x) => x.src.search(src) > -1)

                if (!hasBS) {
                    const browserSyncScript = document.createElement('script');
                    browserSyncScript.src = src;
                    document.body.appendChild(browserSyncScript);
                }
            }, 1000)
        </script>`

    return { cssPaths, jsPaths, html: html.toString() };
}