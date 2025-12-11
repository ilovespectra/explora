import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import pLimit from 'p-limit';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FileMetadata {
    filename: string;
    path: string;
    timestamp: string;
    copied: boolean;
    hash: string | null;
}

interface MetadataFile {
    files: FileMetadata[];
}

// Derive metadata filename from source directory to avoid collisions across runs.
function makeMetadataFilename(srcDir: string): string {
    const base = path.basename(path.resolve(srcDir)).replace(/[^A-Za-z0-9._-]/g, '_');
    const name = base.length > 0 ? base : 'source';
    return `.sorta_metadata_${name}.json`;
}

interface ProcessState {
    totalFiles: number;
    processedFiles: number;
    skippedFiles: number;
    copiedFiles: number;
    errors: string[];
    startTime: number;
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

let globalDuplicateAction: 's' | 'r' | 'a' | null = null;
const STATE_FILE = '.sorta_state.json';
const LOG_FILE = '.sorta_log.txt';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a directory exists
 */
async function directoryExists(dir: string): Promise<boolean> {
    try {
        const stats = await fs.stat(dir);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
    try {
        const stats = await fs.stat(filePath);
        return stats.isFile();
    } catch {
        return false;
    }
}

/**
 * Calculate SHA-256 hash of a file
 */
async function getFileHash(filePath: string): Promise<string | null> {
    try {
        const fileContent = await fs.readFile(filePath);
        const hash = crypto.createHash('sha256').update(fileContent).digest('hex');
        return hash;
    } catch (err) {
        log(`Error hashing file: ${filePath} - ${err}`, 'error');
        return null;
    }
}

/**
 * Log message to console and file
 */
async function log(message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    // Console output with colors
    switch (type) {
        case 'info':
            console.log(chalk.blue(message));
            break;
        case 'warn':
            console.log(chalk.yellow(message));
            break;
        case 'error':
            console.log(chalk.red(message));
            break;
        case 'success':
            console.log(chalk.green(message));
            break;
    }

    // Write to log file
    try {
        await fs.appendFile(LOG_FILE, logMessage, 'utf8');
    } catch (err) {
        console.error(chalk.red(`Failed to write to log file: ${err}`));
    }
}

/**
 * Save process state for resume capability
 */
async function saveState(state: ProcessState, metadataFile: string) {
    try {
        await fs.writeFile(
            STATE_FILE,
            JSON.stringify({
                ...state,
                metadataFile,
                lastSaved: new Date().toISOString(),
            }, null, 2),
            'utf8'
        );
    } catch (err) {
        await log(`Failed to save state: ${err}`, 'error');
    }
}

/**
 * Load previous process state
 */
async function loadState(): Promise<{ state: ProcessState; metadataFile: string } | null> {
    try {
        if (await fileExists(STATE_FILE)) {
            const data = await fs.readFile(STATE_FILE, 'utf8');
            const parsed = JSON.parse(data);
            return {
                state: {
                    totalFiles: parsed.totalFiles,
                    processedFiles: parsed.processedFiles,
                    skippedFiles: parsed.skippedFiles,
                    copiedFiles: parsed.copiedFiles,
                    errors: parsed.errors || [],
                    startTime: parsed.startTime,
                },
                metadataFile: parsed.metadataFile,
            };
        }
    } catch (err) {
        await log(`Failed to load state: ${err}`, 'warn');
    }
    return null;
}

/**
 * Clear state file after successful completion
 */
async function clearState() {
    try {
        if (await fileExists(STATE_FILE)) {
            await fs.unlink(STATE_FILE);
        }
    } catch (err) {
        await log(`Failed to clear state file: ${err}`, 'warn');
    }
}

/**
 * Update progress bar
 */
function updateProgressBar(state: ProcessState) {
    const barLength = 40;
    const progress = Math.min((state.processedFiles / state.totalFiles) * barLength, barLength);
    const filledBar = '█'.repeat(Math.floor(progress));
    const emptyBar = '░'.repeat(barLength - Math.floor(progress));
    const percentage = ((state.processedFiles / state.totalFiles) * 100).toFixed(1);

    const elapsed = (Date.now() - state.startTime) / 1000;
    const rate = state.processedFiles / elapsed;
    const remaining = (state.totalFiles - state.processedFiles) / rate;
    const eta = remaining > 0 && isFinite(remaining) ? `${Math.ceil(remaining)}s` : 'N/A';

    process.stdout.write(
        `\r${chalk.cyan('Progress:')} [${chalk.green(filledBar)}${chalk.gray(emptyBar)}] ${chalk.bold(percentage)}% ` +
        `${chalk.gray(`(${state.processedFiles}/${state.totalFiles})`)} ` +
        `${chalk.yellow(`Copied: ${state.copiedFiles}`)} ${chalk.red(`Skipped: ${state.skippedFiles}`)} ` +
        `${chalk.magenta(`ETA: ${eta}`)}`
    );
}

/**
 * Print final summary
 */
async function printSummary(state: ProcessState) {
    const elapsed = (Date.now() - state.startTime) / 1000;
    console.log('\n\n' + chalk.bold('═'.repeat(80)));
    console.log(chalk.bold.green('✓ ORGANIZATION COMPLETE'));
    console.log(chalk.bold('═'.repeat(80)));
    console.log(chalk.cyan(`Total Files:     ${state.totalFiles}`));
    console.log(chalk.green(`Copied:          ${state.copiedFiles}`));
    console.log(chalk.yellow(`Skipped:         ${state.skippedFiles}`));
    console.log(chalk.red(`Errors:          ${state.errors.length}`));
    console.log(chalk.magenta(`Time Elapsed:    ${elapsed.toFixed(2)}s`));
    console.log(chalk.magenta(`Files/Second:    ${(state.processedFiles / elapsed).toFixed(2)}`));
    console.log(chalk.bold('═'.repeat(80)) + '\n');

    if (state.errors.length > 0) {
        await log(`\nErrors encountered (${state.errors.length}):`, 'warn');
        state.errors.slice(0, 10).forEach(err => log(`  - ${err}`, 'error'));
        if (state.errors.length > 10) {
            await log(`  ... and ${state.errors.length - 10} more (see ${LOG_FILE})`, 'warn');
        }
    }
}

// ============================================================================
// METADATA MANAGEMENT
// ============================================================================

/**
 * Run create-metadata.ts script
 */
async function runCreateMetadata(srcDir: string, metadataFile: string): Promise<boolean> {
    await log(`\n${'═'.repeat(80)}`, 'info');
    await log('STEP 1: Creating metadata with SHA-256 hashing...', 'info');
    await log('═'.repeat(80), 'info');

    try {
        const scriptPath = path.join(__dirname, 'create-metadata.ts');
        await log(`Running: npx tsx ${scriptPath} "${srcDir}" "${metadataFile}"`, 'info');

        execSync(
            `npx tsx "${scriptPath}" "${srcDir}" "${metadataFile}"`,
            { 
                stdio: 'inherit',
                encoding: 'utf8'
            }
        );

        await log('✓ Metadata creation completed', 'success');
        return true;
    } catch (err) {
        await log(`✗ Failed to create metadata: ${err}`, 'error');
        return false;
    }
}

/**
 * Validate metadata file
 */
async function validateMetadata(srcDir: string, metadataFile: string): Promise<boolean> {
    await log(`\n${'═'.repeat(80)}`, 'info');
    await log('STEP 2: Validating metadata...', 'info');
    await log('═'.repeat(80), 'info');

    try {
        // Check if metadata file exists
        if (!await fileExists(metadataFile)) {
            await log(`✗ Metadata file not found: ${metadataFile}`, 'error');
            return false;
        }

        // Load and parse metadata
        const metadataContent = await fs.readFile(metadataFile, 'utf8');
        const metadata: MetadataFile = JSON.parse(metadataContent);

        // Count actual files in source directory
        let actualFileCount = 0;
        const countFiles = async (dir: string) => {
            try {
                const items = await fs.readdir(dir, { withFileTypes: true });
                for (const item of items) {
                    if (item.name.startsWith('.')) continue;
                    const itemPath = path.join(dir, item.name);
                    if (item.isDirectory()) {
                        await countFiles(itemPath);
                    } else {
                        actualFileCount++;
                    }
                }
            } catch {
                // Skip restricted directories
            }
        };

        await countFiles(srcDir);

        const metadataFileCount = metadata.files.length;

        await log(`Files in source directory: ${actualFileCount}`, 'info');
        await log(`Files in metadata:         ${metadataFileCount}`, 'info');

        if (actualFileCount === metadataFileCount) {
            await log('✓ Metadata validation passed - counts match', 'success');
            return true;
        } else {
            const diff = Math.abs(actualFileCount - metadataFileCount);
            await log(`⚠ Warning: ${diff} files mismatch between source and metadata`, 'warn');
            await log('This may indicate files were added/removed after metadata creation', 'warn');
            
            // Ask user if they want to continue
            const answer = await promptUser('Continue anyway? (y/n): ');
            return answer.toLowerCase() === 'y';
        }
    } catch (err) {
        await log(`✗ Metadata validation failed: ${err}`, 'error');
        return false;
    }
}

/**
 * Load metadata from file
 */
async function loadMetadata(metadataFile: string): Promise<MetadataFile | null> {
    try {
        const content = await fs.readFile(metadataFile, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        await log(`Failed to load metadata: ${err}`, 'error');
        return null;
    }
}

/**
 * Update metadata file (mark files as copied)
 */
async function updateMetadata(metadataFile: string, filePath: string, copied: boolean) {
    try {
        const metadata = await loadMetadata(metadataFile);
        if (!metadata) return;

        const fileIndex = metadata.files.findIndex(f => f.path === filePath);
        if (fileIndex !== -1) {
            metadata.files[fileIndex].copied = copied;
            await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 4), 'utf8');
        }
    } catch (err) {
        await log(`Failed to update metadata: ${err}`, 'warn');
    }
}

// ============================================================================
// DUPLICATE HANDLING
// ============================================================================

/**
 * Prompt user for input
 */
async function promptUser(question: string): Promise<string> {
    return new Promise((resolve) => {
        process.stdout.write(chalk.yellow(question));
        process.stdin.once('data', (data) => {
            resolve(data.toString().trim());
        });
    });
}

/**
 * Handle file conflict with duplicate detection
 */
async function handleFileConflict(
    destPath: string,
    baseName: string,
    ext: string,
    sourceHash: string | null
): Promise<string | null> {
    if (await fileExists(destPath)) {
        // Check if files are identical by hash
        if (sourceHash) {
            const destHash = await getFileHash(destPath);
            if (destHash === sourceHash) {
                await log(`Skipping identical file (hash match): ${path.basename(destPath)}`, 'warn');
                return null;
            }
        }

        if (globalDuplicateAction) {
            return await handleDuplicateAction(globalDuplicateAction, destPath, baseName, ext);
        }

        console.log(chalk.yellow(`\nFile conflict: ${destPath}`));
        console.log(chalk.cyan('Options:'));
        console.log(chalk.cyan('  (s) Skip - Do not copy this file'));
        console.log(chalk.cyan('  (r) Replace - Overwrite the existing file'));
        console.log(chalk.cyan('  (a) Add suffix - Create a new file with suffix (file(1).ext)'));
        
        const userChoice = await promptUser('Your choice (s/r/a): ') as 's' | 'r' | 'a';

        if (userChoice === 's' || userChoice === 'r' || userChoice === 'a') {
            const applyToAll = await promptUser('Apply this action to all future duplicates? (y/n): ');
            if (applyToAll.toLowerCase() === 'y') {
                globalDuplicateAction = userChoice;
                await log(`Applying "${userChoice}" to all future duplicates`, 'info');
            }
        }

        return await handleDuplicateAction(userChoice, destPath, baseName, ext);
    }
    return destPath;
}

/**
 * Execute duplicate action
 */
async function handleDuplicateAction(
    action: 's' | 'r' | 'a',
    destPath: string,
    baseName: string,
    ext: string
): Promise<string | null> {
    switch (action) {
        case 's':
            return null; // Skip
        case 'r':
            return destPath; // Replace
        case 'a':
            return await getUniqueDestPath(destPath, baseName, ext);
        default:
            return null;
    }
}

/**
 * Get unique file path with suffix
 */
async function getUniqueDestPath(destPath: string, baseName: string, ext: string): Promise<string> {
    let suffix = 1;
    let newDestPath = destPath;

    while (await fileExists(newDestPath)) {
        newDestPath = path.join(
            path.dirname(destPath),
            `${baseName}(${suffix})${ext}`
        );
        suffix++;
    }
    return newDestPath;
}

// ============================================================================
// FILE ORGANIZATION
// ============================================================================

/**
 * Main organization function
 */
async function organizeFilesByType(
    srcDir: string,
    destDir: string,
    metadataFile: string,
    resume: boolean = false
) {
    const limit = pLimit(10); // Concurrent file operations

    // Initialize or load state
    let state: ProcessState = {
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        copiedFiles: 0,
        errors: [],
        startTime: Date.now(),
    };
    let metadata: MetadataFile | null = null;

    if (resume) {
        const loaded = await loadState();
        if (loaded) {
            state = loaded.state;
            metadataFile = loaded.metadataFile;
            await log('Resuming previous session...', 'info');
            await log(`Previous progress: ${state.processedFiles}/${state.totalFiles} files`, 'info');
        } else {
            await log('No previous state found, starting fresh', 'warn');
            resume = false;
        }
    }

    if (!resume) {
        // Create metadata
        const metadataCreated = await runCreateMetadata(srcDir, metadataFile);
        if (!metadataCreated) {
            await log('Failed to create metadata. Exiting.', 'error');
            process.exit(1);
        }

        // Validate metadata
        const metadataValid = await validateMetadata(srcDir, metadataFile);
        if (!metadataValid) {
            await log('Metadata validation failed. Exiting.', 'error');
            process.exit(1);
        }
    }

    // Load metadata
    metadata = await loadMetadata(metadataFile);
    if (!metadata) {
        await log('Failed to load metadata. Exiting.', 'error');
        process.exit(1);
    }

    // Initialize state if not resuming
    if (!resume) {
        state = {
            totalFiles: metadata.files.length,
            processedFiles: 0,
            skippedFiles: 0,
            copiedFiles: 0,
            errors: [],
            startTime: Date.now(),
        };
    }

    await log(`\n${'═'.repeat(80)}`, 'info');
    await log('STEP 3: Organizing files by extension...', 'info');
    await log('═'.repeat(80), 'info');
    await log(`Source: ${srcDir}`, 'info');
    await log(`Destination: ${destDir}`, 'info');
    await log(`Total files to process: ${state.totalFiles}`, 'info');
    await log('Starting file organization...\n', 'info');

    // Process files
    const processFile = async (fileMetadata: FileMetadata) => {
        // Skip if already copied
        if (fileMetadata.copied && resume) {
            state.processedFiles++;
            state.skippedFiles++;
            return;
        }

        const filePath = fileMetadata.path;
        const ext = path.extname(filePath).toLowerCase();
        const baseName = path.basename(filePath, ext);

        if (!ext) {
            state.processedFiles++;
            state.skippedFiles++;
            await log(`Skipping file without extension: ${filePath}`, 'warn');
            return;
        }

        try {
            // Create type directory
            const typeDir = path.join(destDir, ext.replace('.', ''));
            if (!await directoryExists(typeDir)) {
                await fs.mkdir(typeDir, { recursive: true });
            }

            // Handle duplicates
            const destPath = await handleFileConflict(
                path.join(typeDir, path.basename(filePath)),
                baseName,
                ext,
                fileMetadata.hash
            );

            if (!destPath) {
                state.processedFiles++;
                state.skippedFiles++;
                updateProgressBar(state);
                return;
            }

            // Copy file
            await limit(async () => {
                try {
                    await fs.copyFile(filePath, destPath);
                    state.copiedFiles++;
                    
                    // Update metadata
                    await updateMetadata(metadataFile, filePath, true);
                } catch (err) {
                    const errorMsg = `Failed to copy ${filePath}: ${err}`;
                    state.errors.push(errorMsg);
                    await log(errorMsg, 'error');
                }
            });

            state.processedFiles++;
            updateProgressBar(state);

            // Save state periodically (every 100 files)
            if (state.processedFiles % 100 === 0) {
                await saveState(state, metadataFile);
            }

        } catch (err) {
            const errorMsg = `Error processing ${filePath}: ${err}`;
            state.errors.push(errorMsg);
            await log(errorMsg, 'error');
            state.processedFiles++;
            state.skippedFiles++;
        }
    };

    // Process all files
    for (const file of metadata.files) {
        await processFile(file);
    }

    // Final save and cleanup
    await saveState(state, metadataFile);
    await printSummary(state);
    
    if (state.errors.length === 0) {
        await clearState();
        await log(`\n✓ All operations completed successfully!`, 'success');
        await log(`Log file saved: ${LOG_FILE}`, 'info');
    } else {
        await log(`\n⚠ Completed with errors. State saved for resume.`, 'warn');
        await log(`To resume: ts-node sorta.ts --resume`, 'info');
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║                              SORTA v2.0                                   ║'));
    console.log(chalk.bold.cyan('║                   Smart Terminal-Based File Organizer                     ║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════════════════╝\n'));

    // Check for resume flag
    const resumeFlag = process.argv.includes('--resume');

    if (resumeFlag) {
        const loaded = await loadState();
        if (!loaded) {
            await log('No previous session found to resume.', 'error');
            process.exit(1);
        }

        const srcDir = process.argv[2] || '.';
        const destDir = process.argv[3] || './organized';

        await organizeFilesByType(srcDir, destDir, loaded.metadataFile, true);
        return;
    }

    // Normal execution
    const srcDirectory = process.argv[2];
    const destDirectory = process.argv[3];

    if (!srcDirectory || !destDirectory) {
        console.log(chalk.yellow('Usage:'));
        console.log(chalk.cyan('  ts-node sorta.ts <srcDir> <destDir>          ') + chalk.gray('- Start new organization'));
        console.log(chalk.cyan('  ts-node sorta.ts --resume                    ') + chalk.gray('- Resume interrupted session'));
        console.log(chalk.yellow('\nExamples:'));
        console.log(chalk.cyan('  ts-node sorta.ts ~/Downloads ~/organized'));
        console.log(chalk.cyan('  ts-node sorta.ts --resume\n'));
        process.exit(1);
    }

    // Validate directories
    if (!await directoryExists(srcDirectory)) {
        await log(`Source directory does not exist: ${srcDirectory}`, 'error');
        process.exit(1);
    }

    // Create destination if it doesn't exist
    if (!await directoryExists(destDirectory)) {
        await log(`Creating destination directory: ${destDirectory}`, 'info');
        await fs.mkdir(destDirectory, { recursive: true });
    }

    const metadataFile = path.join(destDirectory, makeMetadataFilename(srcDirectory));

    await organizeFilesByType(srcDirectory, destDirectory, metadataFile, false);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n⚠ Process interrupted by user'));
    console.log(chalk.cyan('State has been saved. You can resume by running:'));
    console.log(chalk.green('  ts-node sorta.ts --resume\n'));
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n\n⚠ Process terminated'));
    console.log(chalk.cyan('State has been saved. You can resume by running:'));
    console.log(chalk.green('  ts-node sorta.ts --resume\n'));
    process.exit(0);
});

// Run main function
main().catch(async (err) => {
    await log(`Fatal error: ${err}`, 'error');
    console.error(chalk.red(`\n✗ Fatal error: ${err.message}`));
    process.exit(1);
});
