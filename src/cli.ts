#!/usr/bin/env node

import { runNodejs, browserPlay, nodejsPlay } from '.';
import { equalAny } from '@giveback007/util-lib';
import { resolve } from 'path';
import { existsSync } from 'fs-extra';
import { logAndExit } from './general.utils';

const err = logAndExit;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(function CLI([c1 = '', c2, c3, ...rest]: string[]): any {
    let cmd1 = c1, cmd2 = c2, cmd3 = c3;
    if ((c1).search(':') !== -1) {
        cmd3 = cmd2;
        [cmd1, cmd2] = c1.split(':');
    }

    if (!cmd1) err('No command specified');

    const is_NODE = equalAny(cmd2, ['nodejs', 'node']);
    const is_WEB = equalAny(cmd2, ['web', 'browser']);
    if (!is_NODE && !is_WEB) err("Either 'node' or 'browser' must be specified");

    switch (cmd1) {
        case 'playground':
        case 'play': {
            const overwrite = cmd3 === '-o' || cmd3 === '-O' || cmd3 === '--overwrite';
            if (is_WEB) return browserPlay({ overwrite });
            else if (is_NODE) return nodejsPlay({ overwrite });
            
            return err("Unhandled Error");
        }
        case 'run':
        case 'watch':
        case 'run-watch':
            if (is_WEB) return err("'Browser' is not implemented yet for 'run-watch' mode");

            if (is_NODE) {
                if (existsSync(resolve(cmd3))) return runNodejs({ entryFile: cmd3, nodeArgs: rest, runOnce: cmd1 === 'run' });
                else throw new Error(`No file: ${resolve(cmd3)}`);
            }

            return err("Unhandled Error");
        default:
            throw new Error(`${cmd1} Not Implemented`);
    }
})(process.argv.slice(2));
