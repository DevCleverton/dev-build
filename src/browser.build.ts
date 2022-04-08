import { arrEnsure, BuilderUtil, configEnv, logAndExit, makeJoinFct, transpileBrowser } from "./general.utils";
import { join, resolve } from 'path';
import chalk from 'chalk';
import { Dict, objKeyVals } from "@giveback007/util-lib";
import type { BuildOptions } from "./general.types";

const { log } = console;

// to build I just need to do the build once
export async function buildBrowser(opts: BuildOptions & {
    /** Options for adding environment variables */
    env?: {
        /** .env files to add */
        envFile?: string | string[];
        /** can define variables here: eg: { isDev: true } -> globalThis.isDev === true */
        define?: Dict<string | boolean | number>; 
    }
}) {
    const {
        copyFiles = [], env,
    } = opts;

    const projectRoot = resolve(opts.projectRoot || './');
    const joinRoot = makeJoinFct(projectRoot);
    
    const fromDir = joinRoot(opts.fromDir);
    const entryFile = join(fromDir, opts.entryFile);
    const toDir = joinRoot(opts.toDir);

    const envVars: Dict<string | boolean | number> = {};
    if (env) {
        const { define = {}, envFile = [] } = env;
        
        arrEnsure(envFile).forEach(fl => {
            const fileVars = configEnv(joinRoot(fl));
            if (!fileVars) logAndExit('Env file errors.');

            objKeyVals(fileVars as Dict<string>).map(({ key, val }) =>
                envVars[key] = val === 'true' || val === 'false' ? val : `"${val}"`
            );
        });
        
        objKeyVals(define)
            .map(({ key, val }) => envVars[key] = val === 'true' || val === 'false' ? val : `"${val}"`);
    }

    
    const builder = new BuilderUtil({
        fromDir, toDir, projectRoot, copyFiles,
        buildFct: () => transpileBrowser(entryFile, toDir, { changeBuildOpts: { incremental: false }, envVars })
    });

    // Start //
    try {
        await builder.cleanToDir();
        await builder.build();
        await builder.copy();
        log(chalk.green('Build Success'));
    } catch {
        log(chalk.red('FAILED BUILD'));
    }

    // process.exit();
}