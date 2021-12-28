import { runNodejs, browserPlay, nodejsPlay } from '.';
import chalk from 'chalk';
import { resolve } from 'path';
import { existsSync } from 'fs-extra';

const { log } = console;

export function runCLI([cmd1, cmd2, cmd3, ...rest]: string[]) {
    const err = (need2nd = false) => {
        log(chalk.red(`${cmd1 || 'Missing-Command-1'}${cmd2 ? (' ' + cmd2) : (need2nd ? ' Missing-Command-2' : '')} not implemented`));
        throw new Error('Invalid CLI Arguments');
    };
    
    if (cmd1 === 'play') {
        const overwrite = cmd3 === '-o' || cmd3 === '-O' || cmd3 === '--overwrite';
        if (cmd2 === 'browser') {
            browserPlay({ overwrite });
        } else if (cmd2 === 'nodejs') {
            nodejsPlay({ overwrite });
        } else {
            err();
        }
    } else if (cmd1 === 'run') {
        if (cmd2 === 'browser') {
            // TODO
            err(true);
        } else if (cmd2 === 'nodejs') {
            if (existsSync(resolve(cmd3))) runNodejs({ entryFile: cmd3, nodeArgs: rest });
        } else {
            err(true);
        }
    } else {
        err();
    }
}
