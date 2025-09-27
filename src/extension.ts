import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn } from 'child_process';
import { AcmeFormatter, FormattingOptions } from './acme-formatter';

function loadInstructionData(context: vscode.ExtensionContext) {
    try {
        const instructionsPath = path.join(context.extensionPath, 'docs', 'instructions.json');
        const instructionsData = fs.readFileSync(instructionsPath, 'utf8');
        const instructions = JSON.parse(instructionsData);
        AcmeFormatter.loadInstructionsFromJson(instructions);
        console.log('Loaded instruction data successfully');
    } catch (error) {
        console.error('Failed to load instruction data:', error);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('ACME Assembler extension is now active!');

    // Load instruction data and initialize formatter
    loadInstructionData(context);

    // Register document formatting provider
    const formattingProvider = new AcmeFormattingProvider();
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('acme', formattingProvider)
    );

    // Register document range formatting provider
    context.subscriptions.push(
        vscode.languages.registerDocumentRangeFormattingEditProvider('acme', formattingProvider)
    );

    // Register hover provider for instruction documentation
    const hoverProvider = new AcmeHoverProvider(context);
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('acme', hoverProvider)
    );

    // Register ACME assembler commands
    const acmeAssembler = new AcmeAssembler();

    context.subscriptions.push(
        vscode.commands.registerCommand('acme.assemble', (uri?: vscode.Uri) => {
            acmeAssembler.assembleFile(uri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('acme.assembleAndRun', (uri?: vscode.Uri) => {
            acmeAssembler.assembleAndRun(uri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('acme.assembleAndRunEmulator', (uri?: vscode.Uri) => {
            acmeAssembler.assembleAndRunEmulator(uri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('acme.assembleAndRunMega65', (uri?: vscode.Uri) => {
            acmeAssembler.assembleAndRunMega65(uri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('acme.buildProject', (uri?: vscode.Uri) => {
            acmeAssembler.buildProject(uri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('acme.showOutput', () => {
            acmeAssembler.showOutput();
        })
    );

    // Register task provider
    context.subscriptions.push(
        vscode.tasks.registerTaskProvider('acme', new AcmeTaskProvider())
    );

    // Auto-assemble on save if enabled
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            if (document.languageId === 'acme') {
                const config = vscode.workspace.getConfiguration('acme');
                if (config.get('autoAssemble', false)) {
                    acmeAssembler.assembleFileSilently(document.uri);
                }
            }
        })
    );

    // Create output channel
    acmeAssembler.initializeOutputChannel();

    // Dispose diagnostics collection on deactivation
    context.subscriptions.push(acmeAssembler['diagnosticsCollection']);
}

export function deactivate() { }

class AcmeFormattingProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private formatter = new AcmeFormatter();

    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        return this.formatDocument(document, options, token);
    }

    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        return this.formatDocument(document, options, token, range);
    }

    private formatDocument(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken,
        range?: vscode.Range
    ): vscode.TextEdit[] {
        const edits: vscode.TextEdit[] = [];
        const text = document.getText(range);
        const formattedText = this.formatter.formatDocument(text, {
            insertSpaces: options.insertSpaces,
            tabSize: options.tabSize
        });

        if (formattedText !== text) {
            const fullRange = range || new vscode.Range(
                document.positionAt(0),
                document.positionAt(text.length)
            );
            edits.push(new vscode.TextEdit(fullRange, formattedText));
        }

        return edits;
    }
}

class AcmeAssembler {
    private outputChannel: vscode.OutputChannel | undefined;
    private diagnosticsCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticsCollection = vscode.languages.createDiagnosticCollection('acme');
    }

    initializeOutputChannel() {
        this.outputChannel = vscode.window.createOutputChannel('ACME Assembler');
    }

    showOutput() {
        if (this.outputChannel) {
            this.outputChannel.show();
        }
    }

    private getConfig() {
        return vscode.workspace.getConfiguration('acme');
    }

    private getAcmeBinary(): string {
        const config = this.getConfig();
        const binaryPath = config.get('binaryPath', 'acme');

        // If it's an absolute path, use it as-is
        if (path.isAbsolute(binaryPath)) {
            return binaryPath;
        }

        // Otherwise, try to find it in PATH
        return this.findBinaryInPath(binaryPath) || binaryPath;
    }

    private findBinaryInPath(binaryName: string): string | null {
        const pathEnv = process.env.PATH || '';
        const pathDirs = pathEnv.split(path.delimiter);

        for (const dir of pathDirs) {
            const fullPath = path.join(dir, binaryName);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }

        return null;
    }

    private getOutputDirectory(): string {
        const config = this.getConfig();
        return config.get('outputDirectory', 'out');
    }

    private getDefaultFormat(): string {
        const config = this.getConfig();
        return config.get('defaultFormat', 'prg');
    }

    private isVerbose(): boolean {
        const config = this.getConfig();
        return config.get('verboseOutput', false);
    }

    private getEmulatorBinary(): string {
        const config = this.getConfig();
        const binaryPath = config.get('emulatorBinary', 'xmega65');

        // If it's an absolute path, use it as-is
        if (path.isAbsolute(binaryPath)) {
            return binaryPath;
        }

        // Otherwise, try to find it in PATH
        return this.findBinaryInPath(binaryPath) || binaryPath;
    }

    private getRunMode(): string {
        const config = this.getConfig();
        return config.get('runMode', 'emulator');
    }

    private getEtherloadCommand(): string {
        const config = this.getConfig();
        return config.get('etherloadCommand', 'etherload');
    }

    private shouldShowTerminalOnRun(): boolean {
        const config = this.getConfig();
        return config.get('showTerminalOnRun', true);
    }

    private async hasToDirective(filePath: string): Promise<boolean> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            // Check for !to directive (case insensitive, with optional whitespace)
            return /^\s*!to\s+/im.test(content);
        } catch (error) {
            // If we can't read the file, assume no !to directive
            return false;
        }
    }

    private async getToDirectiveOutput(filePath: string): Promise<string | null> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const lines = content.split('\n');

            for (const line of lines) {
                // Match !to directive: !to "filename" or !to filename
                const match = line.match(/^\s*!to\s+(?:"([^"]+)"|([^\s,]+))/i);
                if (match) {
                    const outputFile = match[1] || match[2];
                    if (outputFile) {
                        // If it's a relative path, make it relative to the source file directory
                        const sourceDir = path.dirname(filePath);
                        return path.resolve(sourceDir, outputFile);
                    }
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async assembleFile(uri?: vscode.Uri): Promise<void> {
        const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!fileUri) {
            vscode.window.showErrorMessage('No ACME file selected');
            return;
        }

        if (fileUri.scheme !== 'file') {
            vscode.window.showErrorMessage('Please save the file before assembling');
            return;
        }

        const fileName = path.basename(fileUri.fsPath);
        const fileDir = path.dirname(fileUri.fsPath);

        // Check if file has !to directive
        const hasToDirective = await this.hasToDirective(fileUri.fsPath);

        let outputFile = '';
        if (!hasToDirective) {
            // Only specify output file if no !to directive is present
            const outputDir = path.resolve(fileDir, this.getOutputDirectory());

            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            outputFile = path.join(outputDir, path.basename(fileName, path.extname(fileName)) + '.' + this.getDefaultFormat());
        }

        await this.runAcme(fileUri.fsPath, outputFile, fileDir);
    }

    async assembleFileSilently(uri?: vscode.Uri): Promise<void> {
        // Just use the regular assembleFile method since it's now silent
        await this.assembleFile(uri);
    }

    async assembleAndRun(uri?: vscode.Uri): Promise<void> {
        await this.assembleFile(uri);

        const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!fileUri) return;

        const fileName = path.basename(fileUri.fsPath);
        const fileDir = path.dirname(fileUri.fsPath);

        // Check if file has !to directive to determine output file location
        const hasToDirective = await this.hasToDirective(fileUri.fsPath);

        let outputFile = '';
        if (hasToDirective) {
            // Try to parse the !to directive to get the output file
            const toOutputFile = await this.getToDirectiveOutput(fileUri.fsPath);
            if (toOutputFile) {
                outputFile = toOutputFile;
            } else {
                vscode.window.showErrorMessage('Could not parse !to directive output file');
                return;
            }
        } else {
            // Use our default output location
            const outputDir = path.resolve(fileDir, this.getOutputDirectory());
            outputFile = path.join(outputDir, path.basename(fileName, path.extname(fileName)) + '.' + this.getDefaultFormat());
        }

        if (fs.existsSync(outputFile)) {
            const runMode = this.getRunMode();

            if (runMode === 'emulator') {
                await this.runWithEmulator(outputFile);
            } else if (runMode === 'etherload') {
                await this.runWithEtherload(outputFile);
            }
        } else {
            vscode.window.showErrorMessage(`Output file not found: ${outputFile}`);
        }
    }

    async assembleAndRunEmulator(uri?: vscode.Uri): Promise<void> {
        await this.assembleFile(uri);

        const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!fileUri) return;

        const fileName = path.basename(fileUri.fsPath);
        const fileDir = path.dirname(fileUri.fsPath);

        // Check if file has !to directive to determine output file location
        const hasToDirective = await this.hasToDirective(fileUri.fsPath);

        let outputFile = '';
        if (hasToDirective) {
            // Try to parse the !to directive to get the output file
            const toOutputFile = await this.getToDirectiveOutput(fileUri.fsPath);
            if (toOutputFile) {
                outputFile = toOutputFile;
            } else {
                vscode.window.showErrorMessage('Could not parse !to directive output file');
                return;
            }
        } else {
            // Use our default output location
            const outputDir = path.resolve(fileDir, this.getOutputDirectory());
            outputFile = path.join(outputDir, path.basename(fileName, path.extname(fileName)) + '.' + this.getDefaultFormat());
        }

        if (fs.existsSync(outputFile)) {
            await this.runWithEmulator(outputFile);
        } else {
            vscode.window.showErrorMessage(`Output file not found: ${outputFile}`);
        }
    }

    async assembleAndRunMega65(uri?: vscode.Uri): Promise<void> {
        await this.assembleFile(uri);

        const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!fileUri) return;

        const fileName = path.basename(fileUri.fsPath);
        const fileDir = path.dirname(fileUri.fsPath);

        // Check if file has !to directive to determine output file location
        const hasToDirective = await this.hasToDirective(fileUri.fsPath);

        let outputFile = '';
        if (hasToDirective) {
            // Try to parse the !to directive to get the output file
            const toOutputFile = await this.getToDirectiveOutput(fileUri.fsPath);
            if (toOutputFile) {
                outputFile = toOutputFile;
            } else {
                vscode.window.showErrorMessage('Could not parse !to directive output file');
                return;
            }
        } else {
            // Use our default output location
            const outputDir = path.resolve(fileDir, this.getOutputDirectory());
            outputFile = path.join(outputDir, path.basename(fileName, path.extname(fileName)) + '.' + this.getDefaultFormat());
        }

        if (fs.existsSync(outputFile)) {
            await this.runWithEtherload(outputFile);
        } else {
            vscode.window.showErrorMessage(`Output file not found: ${outputFile}`);
        }
    }

    private async runWithEmulator(prgFile: string): Promise<void> {
        const emulatorBinary = this.getEmulatorBinary();
        const command = `"${emulatorBinary}" -besure -prgmode 65 -prg "${prgFile}"`;

        if (this.outputChannel) {
            this.outputChannel.appendLine(`[Run] Starting MEGA65 emulator: ${command}`);
        }

        if (this.shouldShowTerminalOnRun()) {
            // Show terminal for interactive programs
            const terminal = vscode.window.createTerminal('MEGA65 Emulator');
            terminal.show();
            terminal.sendText(command);

            if (this.outputChannel) {
                this.outputChannel.appendLine(`[Run] MEGA65 emulator started in terminal`);
            }
        } else {
            // Try to run silently and only show terminal on error
            return new Promise((resolve) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        // Show terminal on error
                        const terminal = vscode.window.createTerminal('MEGA65 Emulator Error');
                        terminal.show();
                        terminal.sendText(command);
                        if (stderr) {
                            terminal.sendText(`echo "Error output:"`);
                            terminal.sendText(`echo "${stderr}"`);
                        }
                        if (stdout) {
                            terminal.sendText(`echo "Output:"`);
                            terminal.sendText(`echo "${stdout}"`);
                        }
                    } else {
                        // Success - just log to output channel
                        if (this.outputChannel) {
                            this.outputChannel.appendLine(`[Run] MEGA65 emulator started successfully`);
                        }
                    }
                    resolve();
                });
            });
        }
    }

    private async runWithEtherload(prgFile: string): Promise<void> {
        const etherloadCommand = this.getEtherloadCommand();
        const command = `"${etherloadCommand}" -r "${prgFile}"`;

        if (this.outputChannel) {
            this.outputChannel.appendLine(`[Run] Loading and running on MEGA65 via etherload: ${command}`);
        }

        if (this.shouldShowTerminalOnRun()) {
            // Show terminal for interactive programs
            const terminal = vscode.window.createTerminal('MEGA65 Etherload');
            terminal.show();
            terminal.sendText(command);

            if (this.outputChannel) {
                this.outputChannel.appendLine(`[Run] Etherload started in terminal`);
            }
        } else {
            // Try to run silently and only show terminal on error
            return new Promise((resolve) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        // Show terminal on error
                        const terminal = vscode.window.createTerminal('MEGA65 Etherload Error');
                        terminal.show();
                        terminal.sendText(command);
                        if (stderr) {
                            terminal.sendText(`echo "Error output:"`);
                            terminal.sendText(`echo "${stderr}"`);
                        }
                        if (stdout) {
                            terminal.sendText(`echo "Output:"`);
                            terminal.sendText(`echo "${stdout}"`);
                        }
                    } else {
                        // Success - just log to output channel
                        if (this.outputChannel) {
                            this.outputChannel.appendLine(`[Run] Program loaded and running on MEGA65 successfully`);
                        }
                    }
                    resolve();
                });
            });
        }
    }

    async buildProject(uri?: vscode.Uri): Promise<void> {
        const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!fileUri) return;

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        // Find all ACME files in the workspace
        const acmeFiles = await vscode.workspace.findFiles('**/*.{a,asm}', '**/node_modules/**');

        if (acmeFiles.length === 0) {
            vscode.window.showInformationMessage('No ACME files found in workspace');
            return;
        }

        // Assemble all files
        for (const file of acmeFiles) {
            await this.runAcme(file.fsPath, '', path.dirname(file.fsPath));
        }

        vscode.window.showInformationMessage(`Built ${acmeFiles.length} ACME file(s)`);
    }

    private async runAcme(inputFile: string, outputFile: string, workingDir: string): Promise<void> {
        const acmeBinary = this.getAcmeBinary();
        const verbose = this.isVerbose();

        const args: string[] = [];

        // Check if the file has a !to directive
        const hasToDirective = await this.hasToDirective(inputFile);

        // Only use -o if no !to directive is present
        if (outputFile && !hasToDirective) {
            args.push(`-o`, outputFile);
        }

        if (verbose) {
            args.push('-v');
        }

        args.push(inputFile);

        const command = `${acmeBinary} ${args.join(' ')}`;

        if (this.outputChannel) {
            this.outputChannel.appendLine(`[Assemble] Running: ${command}`);
            this.outputChannel.appendLine(`[Assemble] Working directory: ${workingDir}`);
        }

        return new Promise((resolve) => {
            exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
                if (this.outputChannel) {
                    if (stdout) {
                        this.outputChannel.appendLine(`[Assemble] ${stdout}`);
                    }
                    if (stderr) {
                        this.outputChannel.appendLine(`[Assemble] ${stderr}`);
                    }
                }

                // Parse errors and show them in Problems panel
                if (error) {
                    this.parseAndShowErrors(stderr + stdout, inputFile);
                } else {
                    // Clear previous errors for this file
                    this.clearErrorsForFile(inputFile);
                }

                resolve();
            });
        });
    }


    private parseAndShowErrors(output: string, inputFile: string): void {
        const diagnostics: vscode.Diagnostic[] = [];
        const lines = output.split('\n');

        for (const line of lines) {
            // Parse ACME error format: "Error - File file.a, line 12 (Zone <untitled>): Message"
            const errorMatch = line.match(/Error\s*-\s*File\s+([^,]+),\s*line\s+(\d+)\s*\([^)]*\):\s*(.+)/);
            if (errorMatch) {
                const [, file, lineStr, message] = errorMatch;
                const lineNumber = parseInt(lineStr) - 1; // Convert to 0-based index

                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(lineNumber, 0, lineNumber, Number.MAX_VALUE),
                    message,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.source = 'ACME';
                diagnostics.push(diagnostic);
            }

            // Parse ACME warning format: "Warning - File file.a, line 12 (Zone <untitled>): Message"
            const warningMatch = line.match(/Warning\s*-\s*File\s+([^,]+),\s*line\s+(\d+)\s*\([^)]*\):\s*(.+)/);
            if (warningMatch) {
                const [, file, lineStr, message] = warningMatch;
                const lineNumber = parseInt(lineStr) - 1; // Convert to 0-based index

                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(lineNumber, 0, lineNumber, Number.MAX_VALUE),
                    message,
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.source = 'ACME';
                diagnostics.push(diagnostic);
            }
        }

        // Set diagnostics for the file
        const uri = vscode.Uri.file(inputFile);
        this.diagnosticsCollection.set(uri, diagnostics);
    }

    private clearErrorsForFile(inputFile: string): void {
        const uri = vscode.Uri.file(inputFile);
        this.diagnosticsCollection.set(uri, []);
    }
}

class AcmeTaskProvider implements vscode.TaskProvider {
    provideTasks(token?: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> {
        const tasks: vscode.Task[] = [];

        if (vscode.workspace.workspaceFolders) {
            for (const folder of vscode.workspace.workspaceFolders) {
                // Find ACME files in the workspace
                vscode.workspace.findFiles('**/*.{a,asm}', '**/node_modules/**', undefined, token)
                    .then(files => {
                        files.forEach(file => {
                            const task = new vscode.Task(
                                { type: 'acme' },
                                folder,
                                `Assemble ${path.basename(file.fsPath)}`,
                                'ACME',
                                new vscode.ShellExecution('acme', ['-o', '${workspaceFolder}/out/${fileBasenameNoExtension}.prg', '${file}']),
                                'acme'
                            );
                            task.group = vscode.TaskGroup.Build;
                            tasks.push(task);
                        });
                    });
            }
        }

        return tasks;
    }

    resolveTask(task: vscode.Task, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> {
        return task;
    }
}

class AcmeHoverProvider implements vscode.HoverProvider {
    private instructions: any = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadInstructions();
    }

    private loadInstructions() {
        try {
            const instructionsPath = path.join(this.context.extensionPath, 'docs', 'instructions.json');
            const instructionsData = fs.readFileSync(instructionsPath, 'utf8');
            this.instructions = JSON.parse(instructionsData);
        } catch (error) {
            console.error('Failed to load instruction documentation:', error);
        }
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        if (!this.instructions) {
            return null;
        }

        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return null;
        }

        const word = document.getText(range).toUpperCase();
        const instruction = this.instructions.instructions[word];

        if (!instruction) {
            return null;
        }

        // Create hover content
        const hoverContent = this.createHoverContent(instruction);
        return new vscode.Hover(hoverContent, range);
    }

    private createHoverContent(instruction: any): vscode.MarkdownString {
        const content = new vscode.MarkdownString();
        content.supportHtml = true;
        content.isTrusted = true;
        
        // Instruction name with styling
        content.appendMarkdown(`<h2><span style="color:var(--vscode-textPreformat-foreground);">${instruction.name}</span></h2>\n\n`);
        
        // Short description with styling
        if (instruction.shortDescription && instruction.shortDescription !== 'No short description available') {
            content.appendMarkdown(`<span style="color:var(--vscode-charts-blue);font-weight:bold;">${instruction.shortDescription}</span>\n\n`);
        }
        
        // Description with special handling for "Special" sections and verbatim blocks
        let description = instruction.description;
        if (description && description.includes('**Special:**')) {
            // Split description and special section
            const parts = description.split('**Special:**');
            const mainDesc = parts[0].trim();
            const specialDesc = parts[1] ? parts[1].trim() : '';
            
            if (mainDesc) {
                // Handle verbatim blocks and newlines in main description
                const processedMainDesc = mainDesc
                    .replace(/\n/g, '  \n') // Convert single newlines to markdown line breaks
                    .replace(/<pre>/g, '<pre>')
                    .replace(/<\/pre>/g, '</pre>');
                content.appendMarkdown(`${processedMainDesc}\n\n`);
            }
            
            if (specialDesc) {
                content.appendMarkdown(`<span style="color:var(--vscode-charts-orange);background-color:var(--vscode-textBlockQuote-background);padding:4px 8px;border-radius:3px;"><strong>Special:</strong></span>\n\n`);
                // Handle verbatim blocks and newlines in special section
                const processedSpecialDesc = specialDesc
                    .replace(/\n/g, '  \n') // Convert single newlines to markdown line breaks
                    .replace(/<pre>/g, '<pre>')
                    .replace(/<\/pre>/g, '</pre>');
                content.appendMarkdown(`${processedSpecialDesc}\n\n`);
            }
        } else {
            // Handle verbatim blocks and newlines in regular description
            const processedDesc = description
                .replace(/\n/g, '  \n') // Convert single newlines to markdown line breaks
                .replace(/<pre>/g, '<pre>')
                .replace(/<\/pre>/g, '</pre>');
            content.appendMarkdown(`${processedDesc}\n\n`);
        }
        
        // Operation with styling
        if (instruction.operations && Object.keys(instruction.operations).length > 0) {
            // CPU-specific operations
            content.appendMarkdown(`<strong>Operation:</strong>\n\n`);
            for (const [cpu, op] of Object.entries(instruction.operations)) {
                const cpuColor = cpu === '6502' ? 'var(--vscode-charts-red)' : 
                                cpu === '4510' ? 'var(--vscode-charts-blue)' : 
                                'var(--vscode-charts-green)';
                content.appendMarkdown(`<span style="color:${cpuColor};font-weight:bold;">${cpu}:</span> <code>${op}</code>\n\n`);
            }
        } else if (instruction.operation && instruction.operation !== 'No operation specified') {
            // Generic operation
            content.appendMarkdown(`<strong>Operation:</strong> <code>${instruction.operation}</code>\n\n`);
        }
        
        // Flags affected with styling - always render flags section using markdown table
        content.appendMarkdown(`<strong>Flags:</strong>\n\n`);
        
        // Create a markdown table for flags with limited CSS support (only color and background-color work)
        const allFlags = ['N', 'Z', 'I', 'C', 'D', 'V', 'E'];
        let flagsValues = '|';
        
        allFlags.forEach(flag => {
            const isSet = instruction.flags && typeof instruction.flags === 'object' && instruction.flags[flag];
            
            if (isSet) {
                // Set flags: black text on white background (reverse coloring)
                flagsValues += ` <span style="color:#000;background-color:#fff;">&nbsp;${flag}&nbsp;</span> |`;
            } else {
                // Unset flags: grey text (muted on both dark and light backgrounds)
                flagsValues += ` <span style="color:#888;">&nbsp;${flag}&nbsp;</span> |`;
            }
        });
        
        content.appendMarkdown(`${flagsValues}\n\n`);
        
        
        // Side effects with better styling
        if (instruction.sideEffects && instruction.sideEffects.length > 0) {
            content.appendMarkdown(`<strong>Side Effects:</strong>\n\n`);
            content.appendMarkdown(`<ul>\n`);
            for (const effect of instruction.sideEffects) {
                content.appendMarkdown(`<li>${effect}</li>\n`);
            }
            content.appendMarkdown(`</ul>\n\n`);
        }
        
        // Addressing modes with enhanced table styling
        if (instruction.addressingModes && instruction.addressingModes.length > 0) {            
            // Track which cycle modifiers are used across all modes
            const usedModifiers = new Set<string>();
            
            // Create styled table header
            content.appendMarkdown(`<table>\n`);
            content.appendMarkdown(`<thead>\n<tr>\n`);
            content.appendMarkdown(`<th><span style="color:var(--vscode-textPreformat-foreground);background-color:var(--vscode-textBlockQuote-background);padding:4px 8px;">Addressing Mode</span></th>\n`);
            content.appendMarkdown(`<th><span style="color:var(--vscode-textPreformat-foreground);background-color:var(--vscode-textBlockQuote-background);padding:4px 8px;">Assembly</span></th>\n`);
            content.appendMarkdown(`<th><span style="color:var(--vscode-textPreformat-foreground);background-color:var(--vscode-textBlockQuote-background);padding:4px 8px;">Code</span></th>\n`);
            content.appendMarkdown(`<th><span style="color:var(--vscode-textPreformat-foreground);background-color:var(--vscode-textBlockQuote-background);padding:4px 8px;">Cycles</span></th>\n`);
            content.appendMarkdown(`<th><span style="color:var(--vscode-textPreformat-foreground);background-color:var(--vscode-textBlockQuote-background);padding:4px 8px;">Processor</span></th>\n`);
            content.appendMarkdown(`</tr>\n</thead>\n<tbody>\n`);
            
            for (const mode of instruction.addressingModes) {
                // Extract cycle modifiers from the cycles string
                const cycleModifiers = mode.cycles.match(/[iprmds]/g) || [];
                cycleModifiers.forEach((mod: string) => usedModifiers.add(mod));
                
                // Style cycles with superscript modifiers
                const styledCycles = mode.cycles.replace(/([iprmds])/g, '<sup style="color:var(--vscode-charts-orange);">$1</sup>');
                
                content.appendMarkdown(`<tr>\n`);
                content.appendMarkdown(`<td><code>${mode.mode}</code></td>\n`);
                content.appendMarkdown(`<td><code>${mode.syntax}</code></td>\n`);
                content.appendMarkdown(`<td><code>${mode.opcode}</code></td>\n`);
                content.appendMarkdown(`<td><code>${styledCycles}</code></td>\n`);
                content.appendMarkdown(`<td><span style="color:var(--vscode-charts-blue);">${mode.processor}</span></td>\n`);
                content.appendMarkdown(`</tr>\n`);
            }
            
            content.appendMarkdown(`</tbody>\n</table>\n\n`);
            
            // Add footnotes for used cycle modifiers with better styling
            if (usedModifiers.size > 0) {
                content.appendMarkdown(`<strong>Cycle Modifiers:</strong>\n\n`);
                const modifierExplanations: { [key: string]: string } = {
                    'i': 'Add one cycle if clock speed is at 40 MHz.',
                    'p': 'Add one cycle if indexing crosses a page boundary.',
                    'r': 'Add one cycle if clock speed is at 40 MHz.',
                    'm': 'Subtract non-bus cycles when at 40MHz.',
                    'd': 'Subtract one cycle when CPU is at 3.5MHz.',
                    's': 'Instruction requires 2 cycles when CPU is run at 1MHz or 2MHz.'
                };
                
                for (const modifier of Array.from(usedModifiers).sort()) {
                    if (modifierExplanations[modifier]) {
                        content.appendMarkdown(`<span style="color:var(--vscode-charts-orange);"><sup>${modifier}</sup></span> ${modifierExplanations[modifier]}\n\n`);
                    }
                }
            }
        }

        return content;
    }
}
