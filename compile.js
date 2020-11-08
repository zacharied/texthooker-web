const less = require('less');
const fs = require('fs');
const process = require('process');

const SOURCE_DIR = `src`;
const STYLE_DIR = `${SOURCE_DIR}/style`;
const STYLE_MAIN = `${STYLE_DIR}/index.less`;
const SOURCE_FILETYPES = ['html', 'js'];

const OUT_DIR = `build`;

const WATCH_COMPILE_MINIMUM_INTERVAL = 1000;

async function compileLess() {
    let contents = fs.readFileSync(STYLE_MAIN).toString();
    let output = await less.render(contents, { filename: STYLE_MAIN });
    fs.writeFileSync('build/index.css', output.css);
}

async function copySources() {
    for (let dirent of fs.readdirSync(SOURCE_DIR, { withFileTypes: true })) {
        if (!dirent.isFile() || !SOURCE_FILETYPES.includes(dirent.name.split('.').slice(-1)[0].toLowerCase())) continue;

        let sourcePath = `${SOURCE_DIR}/${dirent.name}`;
        let outPath = `${OUT_DIR}/${dirent.name}`;
        fs.copyFileSync(sourcePath, outPath);
    }
    fs.copyFileSync('src/index.html', 'build/index.html');
}

async function main() {
    let runStep = async (func, logText) => {
        try {
            await func();
            console.log(`${logText} DONE`);
        } catch (e) {
            console.log(`${logText} ERROR:\n${e}`);
        }
    };

    await Promise.all([
        runStep(compileLess, 'Compiling styles'),
        runStep(copySources, 'Copying source files')]);
}

if (process.argv[2] === '-w') {
    main();

    let lastTime = new Date().getTime();

    let watchDir = (path) => {
        fs.watch(path, { persistent: true }, (_, filename) => {
            let currentTime = new Date().getTime();
            if (currentTime - lastTime > WATCH_COMPILE_MINIMUM_INTERVAL) {
                console.log(`> File ${filename != null ? `"${filename}"` : `in "${path}"`} was changed.`
                            + ' Recompiling...');
                main();
                lastTime = currentTime;
            }
        });
    };

    watchDir('src');
    watchDir('src/style');
} else {
    main();
}
