import * as fs from 'fs/promises';
import * as path from 'path';
import pLimit from 'p-limit'; 

async function directoryExists(dir: string): Promise<boolean> {
    try {
        await fs.access(dir); 
        return true;
    } catch {
        return false;
    }
}

async function organizeScreenshots(srcDir: string, destDir: string) {
    const limit = pLimit(10);
    let fileCount = 0;

    const processDirectory = async (currentDir: string) => {
        const items = await fs.readdir(currentDir, { withFileTypes: true });
        const promises = items.map(async (item) => {
            const itemPath = path.join(currentDir, item.name);
            if (item.isDirectory()) {
                
                await processDirectory(itemPath);
            } else if (item.name.toLowerCase().includes('screenshot')) {
                
                fileCount++;
                await limit(async () => {
                    const destPath = path.join(destDir, path.basename(item.name));
                    console.log(`Moving ${itemPath} to ${destPath}`);
                    await fs.rename(itemPath, destPath);
                });
            }
        });
        await Promise.all(promises);
    };

    if (!(await directoryExists(destDir))) {
        await fs.mkdir(destDir, { recursive: true }); 
    }

    await processDirectory(srcDir);
    console.log(`Organized ${fileCount} screenshots.`);
}

const srcDirectory = process.argv[2]; 
const destDirectory = path.join(srcDirectory, 'screenshots'); // Destination directory for screenshots, for example

if (!srcDirectory) {
    console.error('Usage: ts-node organizeScreenshots.ts <srcDir>');
    process.exit(1);
}

organizeScreenshots(srcDirectory, destDirectory).catch((err) => {
    console.error(`Error: ${err.message}`);
});
