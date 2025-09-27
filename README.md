# ACME Assembler VS Code Extension

A comprehensive VS Code extension for ACME assembler development, providing syntax highlighting, code formatting, hover documentation, and seamless integration with the ACME assembler and MEGA65 development tools.

## Features

### 🎨 Syntax Highlighting
- **Complete ACME directive support**: `!cpu`, `!to`, `!addr`, `!8`, `!16`, `!by`, `!pet`, `!src`, `!if`, `!macro`, and more
- **Multi-processor instruction set**: Full highlighting for 6502, 4510, and 45GS02 instructions and addressing modes
- **Smart number highlighting**: Hexadecimal (`$1234`), binary (`%1010`), decimal, and character literals
- **Label support**: Global labels, local labels (`+`, `-`), and proper scoping
- **Comment and string highlighting**: Line comments (`;`) and string literals with escape sequences

### 📝 Code Formatting
- **Automatic formatting**: Clean up whitespace, align instructions, and format directives
- **Smart indentation**: Proper indentation for conditional blocks and macros
- **Consistent spacing**: Aligns labels, instructions, and operands for readability
- **Format on save**: Optional automatic formatting when saving files

### 📚 Hover Documentation
- **Multi-processor instruction reference**: Hover over any 6502, 4510, or 45GS02 instruction for detailed documentation
- **Comprehensive details**: Operation descriptions, flag effects, addressing modes, and cycle counts
- **Visual flag display**: Interactive flag status with reverse highlighting for set flags
- **Addressing mode tables**: Complete addressing mode information with syntax and opcodes
- **Side effects**: Detailed information about instruction side effects
- **Processor-specific operations**: CPU-specific operation details for 6502, 4510, and 45GS02

<img width="1502" height="702" alt="image" src="https://github.com/user-attachments/assets/1a35c068-e265-493a-b286-61d104c771e1" />

### 🔧 ACME Integration
- **Direct assembler integration**: Seamless integration with ACME assembler binary
- **Multiple output formats**: Support for PRG, CBM, BIN, and D64 formats
- **Error parsing**: Automatic error detection and display in Problems panel
- **Auto-assemble**: Optional background assembly on file save
- **Build commands**: Assemble individual files or entire projects

### 🎮 MEGA65 Development
- **MEGA65 emulator integration**: Run programs directly in [xmega65 emulator](https://github.com/lgblgblgb/xemu)
- **45GS02 processor support**: Full support for MEGA65's 45GS02 processor with enhanced instruction set
- **4510 processor support**: Complete support for the 4510 processor variant
- **Hardware support**: Load programs to MEGA65 via etherload command
- **Flexible execution**: Choose between emulator or hardware execution modes
- **Automatic binary detection**: Finds emulator and etherload binaries in PATH

### ⚙️ VS Code Integration
- **Task provider**: VS Code task integration for automated builds
- **Context menus**: Right-click support for ACME files
- **Command palette**: Easy access to all ACME commands
- **Output channel**: Dedicated ACME assembler output channel
- **Problem matcher**: Automatic error parsing and display

## Installation

### Quick Install (Recommended)
Use the interactive installer to symlink this repo into VS Code and/or Cursor:

```bash
chmod +x install.sh
./install.sh
```

Flags:
- `--vscode` install for VS Code only
- `--cursor` install for Cursor only
- `--both` install for both
- `-y`, `--yes` run non-interactively and overwrite existing links

Restart the IDE(s) after installation.

### From VSIX (when published)
1. Download the `.vsix` file from releases
2. Install via VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX"
3. Select the downloaded `.vsix` file

## Configuration

The extension provides several configuration options accessible through VS Code settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `acme.binaryPath` | string | `"acme"` | Path to the ACME assembler binary |
| `acme.outputDirectory` | string | `"out"` | Directory for output files |
| `acme.defaultFormat` | string | `"prg"` | Default output format (prg, cbm, bin, d64) |
| `acme.verboseOutput` | boolean | `false` | Enable verbose output from ACME |
| `acme.autoAssemble` | boolean | `false` | Automatically assemble on save |
| `acme.emulatorBinary` | string | `"xmega65"` | Path to MEGA65 emulator binary |
| `acme.runMode` | string | `"emulator"` | Run mode: "emulator" or "etherload" |
| `acme.etherloadCommand` | string | `"etherload"` | Command for MEGA65 etherload |
| `acme.showTerminalOnRun` | boolean | `false` | Show terminal when running programs |

## Usage

### Basic Usage
Open any `.a` or `.asm` file and the extension will automatically provide:
- Syntax highlighting
- Code formatting support
- Hover documentation for instructions
- Context menu options

### Assembling Files

#### Via Context Menu
- **Right-click** on an ACME file in the editor
- Select from available ACME commands:
  - "Assemble File" - Assemble the current file
  - "Assemble and Run" - Assemble and run using configured mode
  - "Assemble and Run on Emulator" - Run on MEGA65 emulator
  - "Assemble and Run on MEGA65" - Run on MEGA65 hardware

#### Via Command Palette
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Search for "ACME" to see all available commands
- Select the desired command

#### Via Keyboard Shortcuts
- `Ctrl+Shift+B` - Run default build task
- `Shift+Alt+F` - Format current document

### Available Commands

| Command | Description |
|---------|-------------|
| `ACME: Assemble File` | Assemble the current file |
| `ACME: Assemble and Run` | Assemble and run using configured run mode |
| `ACME: Assemble and Run on Emulator` | Assemble and run on MEGA65 emulator |
| `ACME: Assemble and Run on MEGA65` | Assemble and run on MEGA65 hardware |
| `ACME: Build Project` | Assemble all ACME files in workspace |
| `ACME: Show Output` | Show ACME assembler output channel |

### Hover Documentation

Hover over any 6502, 4510, or 45GS02 instruction to see:
- **Instruction name** and short description
- **Operation** details and CPU-specific operations
- **Flags affected** with visual status indicators
- **Side effects** in a bulleted list
- **Addressing modes** in a detailed table with:
  - Mode name and assembly syntax
  - Opcode and cycle count
  - Processor compatibility
  - Cycle modifier explanations

### Auto-Assemble on Save

When enabled, the extension automatically assembles ACME files when saved:
- Runs silently in the background
- Displays errors in Problems panel
- Shows detailed output in ACME output channel
- Clears errors when compilation succeeds

## File Support

The extension recognizes these file types:
- `.a` - Primary ACME assembler files
- `.asm` - Generic assembly files

## Supported Processors

The extension provides comprehensive support for three processor architectures:

- **6502** - Classic 8-bit processor with full instruction set support
- **4510** - Enhanced 6502 variant with additional instructions and addressing modes
- **45GS02** - MEGA65's advanced processor with extended instruction set and enhanced capabilities

Each processor is fully supported with:
- Complete instruction set highlighting
- Comprehensive hover documentation
- Processor-specific operation details
- Addressing mode support
- Cycle count information

## Error Handling

Comprehensive error handling includes:
- **Problems panel integration** - Errors and warnings displayed with line numbers
- **Error navigation** - Click errors to jump to problematic lines
- **Auto-clear** - Errors cleared when compilation succeeds
- **Multiple formats** - Supports both ACME error and warning formats

## Development

### Building
```bash
npm install
npm run compile
```

### Watching for Changes
```bash
npm run watch
```

### Testing
Press `F5` in VS Code to launch Extension Development Host and test the extension.

## Requirements

- VS Code 1.74.0 or higher
- Node.js 16.x or higher
- TypeScript 4.9.4 or higher
- ACME assembler binary (for assembly features)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- ACME assembler by Marco Baye
- MEGA65 project team
- VS Code team for the excellent extension API
