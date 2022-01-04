import { readFile } from "fs-extra";
import { parse as parseHTML } from 'node-html-parser';
import { join } from "path";

(async function run() {
    const html = await readFile('./src/assets/browser/index.html', 'utf8');
    html //?
    const css = parseHTML(html).querySelectorAll('[build-dev-css]') as any as HTMLLinkElement[];
    css.toString() //?
})();


