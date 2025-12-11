import * as fs from 'fs/promises';
import * as fss from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as readline from 'readline';

type FileMeta = {
    filename: string;
    path: string;
    timestamp: string;
    copied: boolean;
    hash: string | null;
};

type Metadata = {
    files: FileMeta[];
};

// Generate a unique metadata filename based on the source name to avoid overwrites.
function makeMetadataFilename(sourceDir: string): string {
    const base = path.basename(path.resolve(sourceDir)).replace(/[^A-Za-z0-9._-]/g, '_');
    const name = base.length > 0 ? base : 'source';
    return `.sorta_metadata_${name}.json`;
}

// Stream hashing to avoid loading entire file into memory.
async function getFileHash(filePath: string): Promise<string | null> {
    return new Promise((resolve) => {
        const hash = crypto.createHash('sha256');
        const stream = fss.createReadStream(filePath);

        stream.on('error', (err) => {
            console.error(`Error hashing file: ${filePath} - ${err}`);
            resolve(null);
        });

        stream.on('data', (chunk) => {
            hash.update(chunk);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });
    });
}

// Fast pass to count total files for accurate progress.
async function countFiles(root: string): Promise<number> {
    let count = 0;
    const stack = [root];

    while (stack.length) {
        const current = stack.pop()!;
        let items;
        try {
            items = await fs.readdir(current, { withFileTypes: true });
        } catch (err) {
            if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'EPERM') {
                console.warn(`Skipping restricted folder: ${current}`);
                continue;
            }
            throw err;
        }

        for (const item of items) {
            if (item.name.startsWith('.')) continue;
            const full = path.join(current, item.name);
            if (item.isDirectory()) {
                stack.push(full);
            } else {
                count += 1;
            }
        }
    }

    return count;
}

function renderProgress(processed: number, total: number, currentFile?: string) {
    const percent = total === 0 ? 100 : Math.min(100, (processed / total) * 100);
    const barWidth = 30;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    const fileInfo = currentFile ? ` | ${currentFile}` : '';

    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Progress: [${bar}] ${percent.toFixed(1)}% (${processed}/${total})${fileInfo}`);
}

async function getFileMetadata(dir: string, metadataFile: string) {
    const filesMetadata: Metadata = { files: [] };

    console.log(`\nCounting files in: ${dir} ...`);
    const totalFiles = await countFiles(dir);
    console.log(`Found ${totalFiles} files to process.\n`);

    let processed = 0;
    let skipped = 0;

    const scanDirectory = async (currentDir: string) => {
        let items;
        try {
            items = await fs.readdir(currentDir, { withFileTypes: true });
        } catch (err) {
            if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'EPERM') {
                console.warn(`Skipping restricted folder: ${currentDir}`);
                return;
            }
            throw err;
        }

        for (const item of items) {
            if (item.name.startsWith('.')) continue;
            const filePath = path.join(currentDir, item.name);

            if (item.isDirectory()) {
                await scanDirectory(filePath);
            } else {
                try {
                    const stats = await fs.stat(filePath);
                    const timestamp = stats.birthtime || stats.mtime;
                    const hash = await getFileHash(filePath);

                    filesMetadata.files.push({
                        filename: item.name,
                        path: filePath,
                        timestamp: timestamp.toISOString(),
                        copied: false,
                        hash: hash || null,
                    });
                } catch (err) {
                    skipped += 1;
                    console.warn(`Failed to read file: ${filePath} - ${(err as Error)?.message}`);
                } finally {
                    processed += 1;
                    renderProgress(processed, totalFiles, item.name);
                }
            }
        }
    };

    await scanDirectory(dir);

    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
    console.log(`Progress: 100.0% (${processed}/${totalFiles}) ✅`);

    await fs.writeFile(metadataFile, JSON.stringify(filesMetadata, null, 4), 'utf8');
    console.log(`Metadata saved to ${metadataFile}`);

    if (skipped > 0) {
        console.warn(`Completed with ${skipped} skipped files (permissions/read errors).`);
    }
}

// Get the source directory and metadata output file from command-line arguments
const sourceDir = process.argv[2];
const metadataOutputFile = process.argv[3] || path.join(process.cwd(), makeMetadataFilename(sourceDir));

if (!sourceDir) {
    console.error('Usage: ts-node create-metadata.ts <sourceDir> [metadataOutputFile]');
    process.exit(1);
}

getFileMetadata(sourceDir, metadataOutputFile).catch((err) => {
    console.error(`Error: ${(err as Error)?.message || 'Unknown error'}`);
    process.exit(1);
});
