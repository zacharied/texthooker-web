const less = require('less');
const fs = require('fs');
const bent = require('bent');
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

async function fetchJquery() {
    let fileContents = await bent('string')('https://code.jquery.com/jquery-3.5.0.min.js');
    fs.writeFileSync('build/jquery.js', fileContents);
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
            console.log(`${logText} ERROR: ${e.stack}`);
        }
    };

    await Promise.all([
        runStep(compileLess, 'Compiling styles'),
        runStep(fetchJquery, 'Downloading JQuery'),
        runStep(copySources, 'Copying source files')]);
}

if (process.argv[2] === '-w') {
    main();

    let lastTime = new Date().getTime();

    fs.watch('src/', { persistent: true }, (_1, _2) => {
        let currentTime = new Date().getTime();
        if (currentTime - lastTime > WATCH_COMPILE_MINIMUM_INTERVAL) {
            main();
            lastTime = currentTime;
        }
    });
} else {
    main();
}