export type BuildOptions = {
    /** Directory of entry file relative to `projectRoot`. Eg: `"./src" or "src"`.
     * 
     * Resolution order: [projectRoot + fromDir + entryFile]
     */
     fromDir: string;
     /** Entry file relative to `fromDir`. Eg: `"index.tsx"`.
      * 
      * Resolution order: [projectRoot + fromDir + entryFile]
      */
     entryFile: string;
     /** Out directory relative to `projectRoot`. Eg: `"./dist" or "dist"`.
      * 
      * Resolution order: [projectRoot + toDir]
      */
     toDir: string;
     
     /** Relative path of project root. Eg `"./"` or `"./my-project"`
      * 
      * Default: `'./'`
      */
     projectRoot?: string;
     /** Files and directories to copy into toDir.
      * 
      * Eg: `['public', 'index.html']` ->
      * 
      * `"public"` will copy `<fromDir>/public"` into `<toDir>/public` as well as all the dirs contents and subdirectories.
      * 
      * `"index.html"` will copy `<fromDir>/index.html` into `<toDir>/index.html`.
      */
     copyFiles?: string[];
}

export type DevBuildOptions = BuildOptions & {
    /** Other dirs besides `fromDir` that on change should trigger build & browser refresh.
     * 
     * Eg: `['utils', 'common']`
     */
    watchOtherDirs?: string[];
    /** Restrict the frequency of build events.
     * 
     * Will wait `debounceMs` of milliseconds after last file save before starting to build.
     * 
     * Default: `350`
     */
    debounceMs?: number;
}