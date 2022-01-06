import { isType } from "@giveback007/util-lib";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { resolve } from "path";
import { logCl, timeString } from "./general.utils";
import chalk from 'chalk';

const { log } = console;

export class ChildProcessManager {
    private app: ChildProcessWithoutNullStreams;
    private appStartTime = 0;

    constructor(
        private readonly command: string,
        private readonly args?: string[],
        private readonly projectRoot?: string,
    ) {
        this.app = this.spawnChild();
    }

    reload = async () => {
        await this.kill();
        this.app = this.spawnChild();
    };

    kill = () => new Promise<void>(res => {
        const isRunning = isType(this.app.exitCode, 'null');
        
        const finalize = () => {
            this.app.removeAllListeners();
            this.app.unref();
            res(void(0));
        };

        if (isRunning) {
            this.app.once('exit', finalize);
            this.app.kill();
        } else {
            finalize();
        }
    });

    private spawnChild = () => {
        const root = this.projectRoot ? resolve(this.projectRoot) : null;
        const app = spawn(this.command, this.args || []);

        app.stdout.pipe(process.stdout);
        app.stderr.on('data', (data) => {
            const err: string = data.toString();
            const str = err.replace('Error: \r', '');
            const arr = str.split('\n')
            .filter(x => x
                && x.includes('    at ')
                && !x.includes('node:internal')
                && !x.includes('\\node_modules\\')
            )
            .map(s => s.match(/\(([^)]+)\)/)).filter(x => x)
            .map((x, i) => {
                const str = `[at-${i}]: [${chalk.green((x as RegExpMatchArray)[1])}]`;
                return root ? str.replace(root, '') : str;
            });

            logCl('\nERROR:');
            log(arr.join('\n') + '\n');
            log(err);
        });

        app.addListener('spawn', () => this.appStartTime = Date.now());
        app.addListener('exit', (_, signal) => {
            const time = chalk.yellow(timeString(Date.now() - this.appStartTime));
            log(`> ${chalk.green('Nodejs')}: | time: ${time} | exit: ${chalk.blue(signal)} |`);
            this.kill();
        });

        return app;
    };
}

// '--unhandled-rejections=warn' set to warn because otherwise it will fail and exit silently
const regular = ['--unhandled-rejections=warn', '--enable-source-maps', "--trace-warnings"];
export const nodeFlags = { // "--experimental-loader"
    regular, register: [...regular, "-r", "esbuild-register"],
};
