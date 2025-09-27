# ACME Assembler VS Code Extension

This VS Code extension provides comprehensive support for ACME assembler development, including syntax highlighting, formatting, and direct integration with the ACME assembler.

## Features

- **Syntax Highlighting**: Full syntax highlighting for ACME assembler directives, instructions, labels, and comments
- **Code Formatting**: Automatic formatting for assembly code with proper indentation and spacing
- **Language Support**: Recognizes `.a` and `.asm` files as ACME assembler
- **ACME Integration**: Direct integration with ACME assembler binary
- **Build Commands**: Assemble files and build projects with a single command
- **Task Provider**: VS Code task integration for automated builds
- **Error Parsing**: Parse and display ACME assembler errors in the Problems panel
- **Auto-assemble**: Optional automatic assembly on file save

## Supported Syntax

- ACME directives (e.g., `!cpu`, `!to`, `!8`, `!pet`, `!addr`, `!src`, `!by`)
- Assembly instructions (6502/65C02 instruction set)
- Labels and comments
- Hexadecimal (`$`), binary (`%`), and decimal numbers
- String literals
- Addressing modes and registers

## Installation

1. Copy this extension to your VS Code extensions directory
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press F5 to run the extension in a new Extension Development Host window

## Configuration

The extension provides several configuration options accessible through VS Code settings:

- `acme.binaryPath`: Path to the ACME assembler binary (default: "acme")
- `acme.outputDirectory`: Directory for output files (default: "out")
- `acme.defaultFormat`: Default output format - prg, cbm, bin, or d64 (default: "prg")
- `acme.verboseOutput`: Enable verbose output from ACME (default: false)
- `acme.autoAssemble`: Automatically assemble on save (runs silently in background, default: false)
- `acme.emulatorBinary`: Path to the MEGA65 emulator binary (default: "xmega65"). Get it from https://github.com/lgblgblgb/xemu
- `acme.runMode`: How to run assembled programs - "emulator" uses xmega65, "etherload" uses MEGA65 etherload command (default: "emulator")
- `acme.etherloadCommand`: Command to run programs on MEGA65 via etherload (default: "etherload")

## Usage

### Basic Usage
Open any `.a` or `.asm` file and the extension will automatically provide syntax highlighting and formatting support.

### Assembling Files
- **Right-click** on an ACME file in the editor and select "Assemble File" from the context menu
- **Right-click** on an ACME file in the explorer and select "Build Project" to assemble all ACME files
- Use **Ctrl+Shift+P** and search for "ACME" to access all commands
- Use **Ctrl+Shift+B** to run the default build task

**Note**: The extension respects the `!to` directive in your ACME files. If your file contains a `!to` directive, the extension will not override it with the `-o` flag, avoiding the "Output file name already chosen" warning.

### Available Commands
- `ACME: Assemble File` - Assemble the current file
- `ACME: Assemble and Run` - Assemble the current file and run using configured run mode
- `ACME: Assemble and Run on Emulator` - Assemble the current file and run on MEGA65 emulator
- `ACME: Assemble and Run on MEGA65` - Assemble the current file and run on MEGA65 via etherload
- `ACME: Build Project` - Assemble all ACME files in the workspace
- `ACME: Show Output` - Show the ACME assembler output channel

**Auto-assemble on Save**: When enabled, the extension will automatically assemble your ACME files when you save them. This runs silently in the background without opening terminals or showing notifications. Assembly errors and warnings are automatically displayed in the Problems panel, and you can view detailed output in the ACME Assembler output channel.

### MEGA65 Integration

The extension provides seamless integration with MEGA65 development:

- **Emulator Support**: Run your assembled programs directly in the [xmega65 emulator](https://github.com/lgblgblgb/xemu) with proper MEGA65 mode settings
- **Etherload Support**: Load programs directly to your MEGA65 hardware via etherload command
- **Flexible Configuration**: Choose between emulator or hardware execution modes
- **Automatic Binary Detection**: Finds emulator and etherload binaries in your PATH automatically

**Emulator Command**: `xmega65 -besure -prgmode 65 -prg <prg-file>`
**Etherload Command**: `etherload -r <prg-file>` (configurable)

### Tasks
The extension provides VS Code tasks for building ACME projects. You can:
- Run tasks from the Command Palette (Ctrl+Shift+P → "Tasks: Run Task")
- Use Ctrl+Shift+B for the default build task
- Create custom tasks in `.vscode/tasks.json`

## Formatting

The extension provides automatic formatting that:
- Removes trailing whitespace
- Properly formats directives
- Aligns labels and instructions
- Maintains proper spacing for operands
- Handles indentation for code blocks

Use `Shift+Alt+F` to format the current document or selection.

## Error Handling

The extension includes comprehensive error handling:

- **Problems Panel Integration**: ACME assembler errors and warnings are automatically parsed and displayed in the Problems panel with proper line numbers and error messages
- **Auto-assemble Error Display**: When auto-assemble on save is enabled, compilation errors are shown in the Problems panel without interrupting your workflow
- **Error Navigation**: Click on errors in the Problems panel to jump directly to the problematic line in your source code
- **Error Clearing**: Errors are automatically cleared when compilation succeeds

The extension parses both ACME error and warning formats:
- `Error - File file.a, line 12 (Zone <untitled>): Message`
- `Warning - File file.a, line 12 (Zone <untitled>): Message`
