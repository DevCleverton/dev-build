// TODO: "if you want to specify a different set of starter files you can point to a directory that will copied from"
// TODO: way to configure to run browser and nodejs congruently
// TODO: browser & nodejs debug in vscode

import { mkdir, remove, copy as copyFs } from 'fs-extra';

export * from './browser.dev';
export * from './browser.build';
export * from './browser.play';
export * from './nodejs.dev';
export * from './nodejs.play';
export * from './nodejs.run';

export async function cleanDir(dir: string) {
    await remove(dir);
    await mkdir(dir, { recursive: true });
}

export const copy = copyFs;