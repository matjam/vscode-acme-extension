# ACME Assembler VS Code Extension Features

## Syntax Highlighting

The extension provides comprehensive syntax highlighting for ACME assembler files:

### Directives
- **CPU directives**: `!cpu`, `!to`, `!addr`
- **Data directives**: `!8`, `!16`, `!24`, `!32`, `!by`, `!byte`, `!wo`, `!word`, `!d24`
- **Text directives**: `!pet`, `!text`, `!scr`
- **Memory directives**: `!fill`, `!fillw`, `!skip`, `!skipw`, `!align`
- **Include directives**: `!src`, `!include`
- **Conditional assembly**: `!if`, `!ifdef`, `!ifndef`, `!else`, `!endif`
- **Macros**: `!macro`, `!endmacro`
- **Loops**: `!for`, `!while`, `!wend`
- **Variables**: `!set`, `!let`

### Assembly Instructions
- Complete 6502/65C02 instruction set
- All addressing modes
- Proper highlighting for operands

### Labels
- Global labels (e.g., `start:`, `main:`)
- Local labels (e.g., `+`, `-`, `++`, `--`)

### Numbers
- Hexadecimal: `$1234`, `$ff`
- Binary: `%10101010`
- Decimal: `255`, `1234`
- Character literals: `'A'`, `'$'`

### Comments
- Line comments with `;`
- Full comment highlighting

### Strings
- Double-quoted strings: `"Hello, World!"`
- Single-quoted strings: `'A'`
- Escape sequence support

### Operators
- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Logical: `and`, `or`, `xor`, `not`
- Bitwise: `&`, `|`, `^`, `~`
- Shift: `<<`, `>>`, `shl`, `shr`
- Power: `^`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`

## Code Formatting

The extension provides automatic code formatting that:

- Removes trailing whitespace
- Properly formats directives with consistent spacing
- Aligns labels and instructions
- Maintains proper spacing for operands
- Handles conditional assembly blocks
- Formats macro definitions

## Language Configuration

- **Comments**: Line comments with `;`
- **Brackets**: `{}`, `[]`, `()`
- **Auto-closing pairs**: Quotes, brackets
- **Folding**: Region markers with `; #region` and `; #endregion`
- **Indentation**: Smart indentation for conditional blocks and macros

## File Association

The extension automatically recognizes:
- `.a` files (primary ACME assembler files)
- `.asm` files (generic assembly files)

## Installation

1. Run `./install.sh` to install dependencies and compile
2. Press F5 in VS Code to test the extension
3. Open any `.a` file to see syntax highlighting in action

## Testing

The extension includes several test files:
- `example-main.a` - Simple ACME program
- `example-c64misc.a` - Complex example with macros and conditionals
- `test-examples/test.acme` - Comprehensive syntax demonstration

## Compatibility

- VS Code 1.74.0 or higher
- TypeScript 4.9.4 or higher
- Node.js 16.x or higher
