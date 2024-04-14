import * as fs from 'node:fs';
import * as path from 'node:path';

function loadCircomFiles(directory) {
    let filesObject = {};

    function readDirectory(dir) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        items.forEach(item => {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                // Recursively read subdirectory
                readDirectory(fullPath);
            } else if (item.isFile() && path.extname(item.name) === '.circom') {
                // Read file content if the extension is .circom
                const content = fs.readFileSync(fullPath, 'utf8');
                const filename = path.basename(item.name);
                filesObject[filename] = content;
            }
        });
    }

    readDirectory(directory);
    return filesObject;
}

// Example usage
const directoryPath = './node_modules/circomlib/circuits';
const circomFiles = loadCircomFiles(directoryPath);
console.log(JSON.stringify(circomFiles, null, 2));

