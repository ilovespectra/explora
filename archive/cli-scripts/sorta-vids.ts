import * as fs from 'fs/promises';
import * as path from 'path';
import pLimit from 'p-limit';
import chalk from 'chalk';
import { SingleBar, Presets } from 'cli-progress';

const metadataFilePath = './file_metadata.json';

interface FileMetadata {
    filename: string;
    path: string;
    timestamp: string;
    copied: boolean;
    hash: string;
}

let fileMetadataArray: FileMetadata[] = [];
let fileMetadataMap: Record<string, FileMetadata> = {};
const copiedHashes: Set<string> = new Set(); 

// Variables to track duplicates and space saved
let duplicateCount = 0;
let spaceSaved = 0;

try {
    const metadataFile = await fs.readFile(metadataFilePath, 'utf-8');
    fileMetadataArray = JSON.parse(metadataFile).files;

    // Create a quick lookup map for metadata by file path
    fileMetadataMap = fileMetadataArray.reduce((map, item) => {
        map[item.path] = item;
        return map;
    }, {} as Record<string, FileMetadata>);

    // Populate the copiedHashes set with the hashes of already copied files
    fileMetadataArray.forEach((item) => {
        if (item.copied) {
            copiedHashes.add(item.hash);
        }
    });
} catch (err) {
    console.error(chalk.red(`Error reading metadata file: ${err}`));
}

const videoExtensions = new Set([
    '.mp4', '.m4v', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm',
    '.mpg', '.mpeg', '.hevc', '.h265', '.rm', '.rmvb', '.3gp', '.asf',
    '.vob', '.dat', '.swf', '.ts', '.m2ts', '.f4v', '.mxf', '.ogv',
    '.yuv', '.mjpg', '.mjpeg', '.divx', '.xvid', '.amv', '.vid', '.scm',
]);

function formatTimestamp(timestamp: string): string {
    if (timestamp === "1980-01-01T05:00:00.000Z") {
        console.warn(chalk.yellow(`Invalid timestamp: ${timestamp}. Using current date.`));
        return new Date().toISOString().split('T')[0]; // Use current date (YYYY-MM-DD)
    }

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function directoryExists(dir: string): Promise<boolean> {
    try {
        await fs.access(dir);
        return true;
    } catch {
        return false;
    }
}

async function updateMetadataFile() {
    await fs.writeFile(metadataFilePath, JSON.stringify({ files: fileMetadataArray }, null, 4), 'utf-8');
}

async function organizeFilesByType(srcDir: string, destDir: string) {
    const limit = pLimit(10);
    const allFiles: string[] = [];

    const collectFiles = async (currentDir: string) => {
        try {
            const items = await fs.readdir(currentDir, { withFileTypes: true });
    
            for (const item of items) {
                const itemPath = path.join(currentDir, item.name);
    
                if (item.name.startsWith('.')) {
                    console.warn(chalk.yellow(`Skipping hidden or system directory: ${itemPath}`));
                    continue;
                }
    
                if (item.isDirectory()) {
                    await collectFiles(itemPath);
                } else {
                    allFiles.push(itemPath);
                }
            }
        } catch (err) {
            if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'EPERM') {
                console.warn(chalk.yellow(`Permission denied: ${currentDir}`));
            } else {
                console.error(chalk.red(`Error accessing directory: ${currentDir}`));
                console.error(err);
            }
        }
    };

    await collectFiles(srcDir);

    const relevantFiles = allFiles.filter(filePath =>
        videoExtensions.has(path.extname(filePath).toLowerCase())
    );

    const totalFiles = relevantFiles.length;
    if (totalFiles === 0) {
        console.log('No videos to organize.');
        return;
    }

    console.log(`Found ${totalFiles} videos. Starting organization...`);

    const progressBar = new SingleBar({
        format: `Processing |${chalk.cyan('{bar}')}| {percentage}% | {value}/{total} Videos`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
    }, Presets.shades_classic);

    progressBar.start(totalFiles, 0);

    let processedFiles = 0;

    const processFile = async (filePath: string) => {
        const ext = path.extname(filePath).toLowerCase();
        const metadata = fileMetadataMap[filePath];
        if (!metadata) {
            console.log(chalk.yellow(`No metadata for video: ${filePath}`));
            progressBar.increment();
            return;
        }

        // Skip the file if the hash is already copied
        if (copiedHashes.has(metadata.hash)) {
            console.log(chalk.cyan(`Video already copied (duplicate hash): ${filePath}`));
            duplicateCount++;

            // Get file size and add to space saved
            const stats = await fs.stat(filePath);
            spaceSaved += stats.size;
            progressBar.increment();
            return;
        }

        const typeDir = path.join(destDir, 'videos', ext.replace('.', ''));
        if (!(await directoryExists(typeDir))) {
            await fs.mkdir(typeDir, { recursive: true });
        }

        const formattedTimestamp = formatTimestamp(metadata.timestamp);
        const baseName = path.basename(filePath, ext);
        let destFileName = `${formattedTimestamp}_${baseName}${ext}`;
        let destPath = path.join(typeDir, destFileName);

        try {
            if (await fs.access(destPath).then(() => true).catch(() => false)) {
                console.log(chalk.yellow(`Video already exists: ${destPath}`));
                destFileName = `${formattedTimestamp}_${baseName}_copy${ext}`;
                destPath = path.join(typeDir, destFileName);
            }

            await fs.rename(filePath, destPath);
            console.log(chalk.green(`Moved: ${filePath} -> ${destPath}`));

            metadata.copied = true;
            copiedHashes.add(metadata.hash);
            processedFiles++;
            progressBar.increment();
        } catch (err) {
            console.error(chalk.red(`Error processing video: ${filePath}`));
            console.error(err);
        }
    };

    const processFilesConcurrently = async () => {
        const promises = relevantFiles.map((filePath) => {
            return limit(async () => {
                await processFile(filePath);
            });
        });
    
        await Promise.all(promises);
    };
    
    await processFilesConcurrently();

    progressBar.stop();
    console.log(`Processed ${processedFiles} out of ${totalFiles} files.`);
    console.log(chalk.yellow(`Found ${duplicateCount} duplicates and saved ${chalk.green((spaceSaved / (1024 * 1024)).toFixed(2))} MB by skipping them.`));

    await updateMetadataFile();
}

const srcDir = '/path/to/source'; 
const destDir = '/path/to/destination'; 

await organizeFilesByType(srcDir, destDir);
