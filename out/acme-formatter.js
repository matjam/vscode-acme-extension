"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcmeFormatter = void 0;
class AcmeFormatter {
    static getInstructions() {
        return this.instructions;
    }
    static loadInstructionsFromJson(instructionsData) {
        if (instructionsData && instructionsData.instructions) {
            this.instructions = Object.keys(instructionsData.instructions);
        }
    }
    formatDocument(document, options) {
        const lines = document.split('\n');
        const indentString = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
        let indentLevel = 0;
        const formattedLines = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            // Handle standalone comments - move to leftmost column
            if (trimmed.startsWith(';') || trimmed.startsWith('//')) {
                formattedLines.push(trimmed);
                // Comments don't affect indentation level
                continue;
            }
            // Handle inline brace expressions - split them across multiple lines
            if (this.hasInlineBraces(trimmed)) {
                const splitLines = this.splitInlineBraces(trimmed, indentLevel, indentString);
                formattedLines.push(...splitLines);
                // Simulate the brace level changes that would happen if we processed
                // each split line individually
                for (const splitLine of splitLines) {
                    indentLevel = this.calculateNextIndentLevel(splitLine, indentLevel);
                }
                continue;
            }
            // Check if this line has both a label and an instruction (needs to be split)
            // Match word labels or anonymous labels (+ or -) followed by instruction
            const labelInstructionMatch = trimmed.match(/^([a-zA-Z_@][a-zA-Z0-9_@]*|[+\-]+)\s+(.+)$/);
            if (labelInstructionMatch) {
                const [, potentialLabel, instruction] = labelInstructionMatch;
                // Check if the first word is actually a label (not an instruction or assignment)
                if (this.isLabel(potentialLabel) && !this.isInstruction(potentialLabel) && !trimmed.includes('=')) {
                    // Add label on its own line (no indentation)
                    formattedLines.push(potentialLabel);
                    // Format and add instruction on next line with proper indentation
                    const formattedInstruction = this.formatInstruction(instruction, options);
                    const indentedInstruction = indentString.repeat(Math.max(1, indentLevel)) + formattedInstruction;
                    formattedLines.push(indentedInstruction);
                    // Calculate indentation for next line (based on the instruction)
                    indentLevel = this.calculateNextIndentLevel(instruction, indentLevel);
                }
                else {
                    // It's not a label+instruction split, format normally
                    const formattedLine = this.formatLine(line, options, indentLevel, indentString);
                    formattedLines.push(formattedLine);
                    indentLevel = this.calculateNextIndentLevel(line, indentLevel);
                }
            }
            else {
                const formattedLine = this.formatLine(line, options, indentLevel, indentString);
                formattedLines.push(formattedLine);
                // Calculate indentation for next line
                indentLevel = this.calculateNextIndentLevel(line, indentLevel);
            }
        }
        return formattedLines.join('\n');
    }
    formatLine(line, options, indentLevel, indentString) {
        const trimmed = line.trim();
        // Handle empty lines and comments
        if (trimmed === '' || trimmed.startsWith(';') || trimmed.startsWith('//')) {
            // For standalone comments, remove leading whitespace and move to leftmost column
            if (trimmed.startsWith(';') || trimmed.startsWith('//')) {
                return trimmed;
            }
            return line;
        }
        let result = line;
        // Handle different types of lines
        if (this.isDirective(trimmed)) {
            result = this.formatDirective(line, options);
        }
        else if (this.isDataDefinition(trimmed)) {
            result = this.formatDataDefinition(trimmed, options);
        }
        else if (this.isInstruction(trimmed)) {
            result = this.formatInstruction(line, options);
        }
        else if (this.isSymbolDefinition(trimmed)) {
            result = this.formatSymbolDefinition(trimmed, options);
        }
        else if (this.isPcDefinition(trimmed)) {
            result = this.formatPcDefinition(trimmed, options);
        }
        else if (this.isComment(trimmed)) {
            result = this.formatComment(trimmed);
        }
        // Apply indentation after formatting based on the rules:
        // - Labels: NEVER indented
        // - Conditional directives (!if, !ifndef, etc.): indented when inside blocks
        // - Other directives: indented based on context (preamble vs blocks)
        // - Instructions and macro calls: always indented at least one level, more if in blocks
        // - Closing braces: indented at the same level as the line that opened the block
        if (result && !this.isLabel(trimmed) && !this.isOpeningBrace(trimmed)) {
            if (trimmed === '@entry') {
                console.log('@entry is NOT being indented (correct)');
            }
            // Strip any existing indentation before applying new indentation
            const strippedResult = result.replace(/^[\s\t]+/, '');
            if (this.isClosingBrace(trimmed)) {
                // Closing braces should be indented at the same level as the line that opened the block
                result = indentString.repeat(Math.max(0, indentLevel - 1)) + strippedResult;
            }
            else {
                // Instructions and assignments always get at least 1 level of indentation
                const isInstructionOrAssignment = this.isInstruction(trimmed) ||
                    this.isPcDefinition(trimmed) ||
                    this.isSymbolDefinition(trimmed);
                const minIndentLevel = isInstructionOrAssignment ? Math.max(1, indentLevel) : indentLevel;
                result = indentString.repeat(minIndentLevel) + strippedResult;
            }
        }
        else {
            // For labels, strip any existing indentation to ensure they're left-aligned
            if (this.isLabel(trimmed)) {
                result = result.replace(/^[\s\t]+/, '');
            }
        }
        return result;
    }
    formatBlock(block, options, indentLevel, indentString) {
        if (block.length === 0)
            return block;
        // Check if this block has comments that need alignment
        const hasComments = block.some(line => {
            const trimmed = line.trim();
            return trimmed.includes(';') && !trimmed.startsWith(';');
        });
        if (!hasComments) {
            // No comments to align, format normally
            return block.map(line => this.formatLine(line, options, indentLevel, indentString));
        }
        // Find the longest instruction line (without comment) to determine alignment
        let maxInstructionLength = 0;
        const processedLines = [];
        for (const line of block) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed.startsWith(';') || trimmed.startsWith('//')) {
                processedLines.push({
                    original: line,
                    instruction: '',
                    comment: '',
                    hasComment: false
                });
                continue;
            }
            // Split line into instruction and comment parts
            const commentIndex = trimmed.indexOf(';');
            let instruction = trimmed;
            let comment = '';
            let hasComment = false;
            if (commentIndex !== -1) {
                instruction = trimmed.substring(0, commentIndex).trim();
                comment = trimmed.substring(commentIndex);
                hasComment = true;
            }
            // Apply basic formatting to instruction
            const formattedInstruction = this.formatInstructionOnly(instruction, options);
            // Determine if this line should be indented
            let instructionWithIndent = formattedInstruction;
            if (!this.isLabel(instruction) && !this.isClosingBrace(instruction) && !this.isOpeningBrace(instruction)) {
                // Strip any existing indentation before applying new indentation
                const strippedInstruction = formattedInstruction.replace(/^[\s\t]+/, '');
                // Instructions and assignments always get at least 1 level of indentation
                const isInstructionOrAssignment = this.isInstruction(instruction) ||
                    this.isPcDefinition(instruction) ||
                    this.isSymbolDefinition(instruction);
                const minIndentLevel = isInstructionOrAssignment ? Math.max(1, indentLevel) : indentLevel;
                instructionWithIndent = indentString.repeat(minIndentLevel) + strippedInstruction;
            }
            if (instructionWithIndent.length > maxInstructionLength) {
                maxInstructionLength = instructionWithIndent.length;
            }
            processedLines.push({
                original: line,
                instruction: formattedInstruction,
                comment: comment,
                hasComment: hasComment
            });
        }
        // Format all lines with aligned comments
        return processedLines.map(({ original, instruction, comment, hasComment }) => {
            if (instruction === '' && comment === '') {
                return original; // Empty line or comment-only line
            }
            if (!hasComment) {
                // Determine if this line should be indented
                if (!this.isLabel(instruction) && !this.isClosingBrace(instruction) && !this.isOpeningBrace(instruction)) {
                    // Strip any existing indentation before applying new indentation
                    const strippedInstruction = instruction.replace(/^[\s\t]+/, '');
                    // Instructions and assignments always get at least 1 level of indentation
                    const isInstructionOrAssignment = this.isInstruction(instruction) ||
                        this.isPcDefinition(instruction) ||
                        this.isSymbolDefinition(instruction);
                    const minIndentLevel = isInstructionOrAssignment ? Math.max(1, indentLevel) : indentLevel;
                    return indentString.repeat(minIndentLevel) + strippedInstruction;
                }
                else {
                    return instruction;
                }
            }
            // Special handling for closing braces with comments
            if (this.isClosingBrace(instruction)) {
                // Closing braces with comments should have no space before the comment
                const formattedComment = comment.trim();
                return instruction + formattedComment;
            }
            // Format comment with proper spacing
            const formattedComment = this.formatComment(comment);
            // Determine if this line should be indented
            let instructionWithIndent = instruction;
            if (!this.isLabel(instruction) && !this.isClosingBrace(instruction) && !this.isOpeningBrace(instruction)) {
                // Strip any existing indentation before applying new indentation
                const strippedInstruction = instruction.replace(/^[\s\t]+/, '');
                // Instructions and assignments always get at least 1 level of indentation
                const isInstructionOrAssignment = this.isInstruction(instruction) ||
                    this.isPcDefinition(instruction) ||
                    this.isSymbolDefinition(instruction);
                const minIndentLevel = isInstructionOrAssignment ? Math.max(1, indentLevel) : indentLevel;
                instructionWithIndent = indentString.repeat(minIndentLevel) + strippedInstruction;
            }
            const padding = ' '.repeat(Math.max(1, maxInstructionLength - instructionWithIndent.length + 1));
            return instructionWithIndent + padding + formattedComment;
        });
    }
    calculateNextIndentLevel(line, currentLevel) {
        const trimmed = line.trim();
        // If this line has an opening brace, increase indentation for next line
        if (this.hasOpeningBrace(trimmed)) {
            return currentLevel + 1;
        }
        // If this line is a closing brace, decrease indentation for next line
        if (this.isClosingBrace(trimmed)) {
            return Math.max(0, currentLevel - 1);
        }
        // If this line is a label, set indentation to at least 1 for following code
        // This makes labels stand out by indenting the code that follows them
        if (this.isLabel(trimmed)) {
            return Math.max(1, currentLevel);
        }
        // For all other statements, return current level
        return currentLevel;
    }
    formatDirective(line, options) {
        // Directives should maintain their original spacing, just clean up whitespace
        const trimmed = line.trim();
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            const directive = parts[0];
            const rest = parts.slice(1).join(' ');
            return `${directive} ${rest}`;
        }
        return trimmed;
    }
    formatDataDefinition(line, options) {
        // Data definitions should be formatted with proper spacing
        const trimmed = line.trim();
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            const directive = parts[0];
            const rest = parts.slice(1).join(' ');
            return `${directive}\t${rest}`;
        }
        return trimmed;
    }
    formatInstruction(line, options) {
        // Instructions should be formatted with proper spacing
        const trimmed = line.trim();
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            const mnemonic = parts[0];
            const operands = parts.slice(1).join(' ');
            return `${mnemonic}\t${operands}`;
        }
        return trimmed;
    }
    formatInstructionOnly(instruction, options) {
        // Format instruction without indentation
        const trimmed = instruction.trim();
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            const mnemonic = parts[0];
            const operands = parts.slice(1).join(' ');
            return `${mnemonic}\t${operands}`;
        }
        return trimmed;
    }
    formatSymbolDefinition(line, options) {
        // Symbol definitions should maintain their original spacing, just clean up whitespace
        const trimmed = line.trim();
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 3) {
            const symbol = parts[0];
            const equals = parts[1];
            const value = parts.slice(2).join(' ');
            return `${symbol} ${equals} ${value}`;
        }
        return trimmed;
    }
    formatPcDefinition(line, options) {
        // PC definitions should maintain their original spacing, just clean up whitespace
        const trimmed = line.trim();
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 3) {
            const pc = parts[0];
            const equals = parts[1];
            const value = parts.slice(2).join(' ');
            return `${pc} ${equals} ${value}`;
        }
        return trimmed;
    }
    formatComment(line) {
        // Comments should have proper spacing
        const trimmed = line.trim();
        if (trimmed.startsWith(';')) {
            return `; ${trimmed.substring(1).trim()}`;
        }
        return trimmed;
    }
    isLabel(line) {
        const trimmed = line.trim();
        // Exclude empty lines and comments
        if (trimmed === '' || trimmed.startsWith(';') || trimmed.startsWith('//')) {
            return false;
        }
        // Check for labels ending with colon
        if (trimmed.endsWith(':')) {
            return true;
        }
        // Check for anonymous labels (+ or -)
        if (/^[+\-]+$/.test(trimmed)) {
            return true;
        }
        // Check for word labels (not instructions, not directives)
        if (/^[a-zA-Z_@][a-zA-Z0-9_@]*$/.test(trimmed)) {
            // Make sure it's not a known instruction or directive
            const upper = trimmed.toUpperCase();
            if (AcmeFormatter.getInstructions().includes(upper)) {
                return false;
            }
            // Not a directive (starts with !)
            if (trimmed.startsWith('!')) {
                return false;
            }
            return true;
        }
        return false;
    }
    isAnonymousLabel(line) {
        const trimmed = line.trim();
        // Check for anonymous forward/backward labels (+, ++, +++, -, --, ---, etc.)
        return /^[+\-]+$/.test(trimmed);
    }
    hasBranchToAnonymousLabel(line) {
        const trimmed = line.trim();
        // Check if line contains a branch instruction followed by anonymous label
        return /^\s*(bcc|bcs|beq|bmi|bne|bpl|bvc|bvs|jmp|jsr)\s+[+\-]+$/.test(trimmed);
    }
    isDirective(line) {
        const trimmed = line.trim();
        return trimmed.startsWith('!');
    }
    isDataDefinition(line) {
        const trimmed = line.trim();
        return AcmeFormatter.DATA_DIRECTIVES.some(directive => trimmed.startsWith(directive));
    }
    isControlDirective(line) {
        const trimmed = line.trim();
        return AcmeFormatter.CONTROL_DIRECTIVES.some(directive => trimmed.startsWith(directive));
    }
    isConditionalDirective(line) {
        const trimmed = line.trim();
        return AcmeFormatter.CONDITIONAL_DIRECTIVES.some(directive => trimmed.startsWith(directive));
    }
    isInstruction(line) {
        const trimmed = line.trim();
        const upper = trimmed.toUpperCase();
        return AcmeFormatter.getInstructions().some(instruction => upper.startsWith(instruction));
    }
    isSymbolDefinition(line) {
        const trimmed = line.trim();
        return /^[a-zA-Z_@][a-zA-Z0-9_@]*\s*=\s*/.test(trimmed);
    }
    isPcDefinition(line) {
        const trimmed = line.trim();
        // Check for PC definition (starting with *)
        return /^\*\s*=/.test(trimmed);
    }
    isMacroCall(line) {
        const trimmed = line.trim();
        // Check for macro call (starting with + followed by macro name)
        return /^\+[a-zA-Z_@][a-zA-Z0-9_@]*/.test(trimmed);
    }
    isComment(line) {
        const trimmed = line.trim();
        return trimmed.startsWith(';') || trimmed.startsWith('//');
    }
    isOpeningBrace(line) {
        const trimmed = line.trim();
        return trimmed === '{';
    }
    isClosingBrace(line) {
        const trimmed = line.trim();
        return trimmed === '}' || trimmed.startsWith('}');
    }
    hasOpeningBrace(line) {
        const trimmed = line.trim();
        return trimmed.includes('{');
    }
    hasInlineBraces(line) {
        const trimmed = line.trim();
        // Check if line contains both opening and closing braces on the same line
        // and it's not already a proper block structure
        const hasOpenBrace = trimmed.includes('{');
        const hasCloseBrace = trimmed.includes('}');
        const isBlockStart = trimmed.endsWith('{');
        const isBlockEnd = trimmed.startsWith('}');
        return hasOpenBrace && hasCloseBrace && !isBlockStart && !isBlockEnd;
    }
    splitInlineBraces(line, indentLevel, indentString) {
        const trimmed = line.trim();
        const result = [];
        // Find the opening brace
        const openBraceIndex = trimmed.indexOf('{');
        const closeBraceIndex = trimmed.lastIndexOf('}');
        if (openBraceIndex === -1 || closeBraceIndex === -1 || openBraceIndex >= closeBraceIndex) {
            // Malformed braces, return as-is
            return [line];
        }
        // Extract parts
        const beforeBrace = trimmed.substring(0, openBraceIndex).trim();
        const insideBraces = trimmed.substring(openBraceIndex + 1, closeBraceIndex).trim();
        const afterBrace = trimmed.substring(closeBraceIndex + 1).trim();
        // Apply the same indentation logic as the normal formatter
        // For conditional directives, they should be indented when inside blocks
        let firstLineIndent = indentLevel;
        if (this.isConditionalDirective(beforeBrace)) {
            // Conditional directives get indented based on current level
            firstLineIndent = indentLevel;
        }
        else if (this.isControlDirective(beforeBrace) && indentLevel === 0) {
            // Other control directives in preamble stay at left margin
            firstLineIndent = 0;
        }
        // Add the line with opening brace - respect determined indentation level
        const indentedFirstLine = indentString.repeat(firstLineIndent) + beforeBrace + ' {';
        result.push(indentedFirstLine);
        // Add the content inside braces with proper indentation
        if (insideBraces) {
            const indentedContent = indentString.repeat(indentLevel + 1) + insideBraces;
            result.push(indentedContent);
        }
        // Add the closing brace with proper indentation
        const indentedCloseBrace = indentString.repeat(indentLevel) + '}';
        if (afterBrace) {
            result.push(indentedCloseBrace + ' ' + afterBrace);
        }
        else {
            result.push(indentedCloseBrace);
        }
        return result;
    }
}
exports.AcmeFormatter = AcmeFormatter;
AcmeFormatter.instructions = [];
AcmeFormatter.DATA_DIRECTIVES = [
    '!byte', '!word', '!qword', '!by', '!wo', '!dw', '!dd', '!dq',
    '!pet', '!text', '!scr', '!raw', '!fill', '!align', '!skip', '!pad',
    '!8', '!16', '!24', '!32', '!64', '!128', '!256', '!512', '!1024'
];
AcmeFormatter.CONTROL_DIRECTIVES = [
    '!addr', '!align', '!assert', '!binary', '!bin', '!cpu', '!ct', '!encoding',
    '!error', '!fatal', '!file', '!if', '!ifdef', '!ifndef', '!else', '!endif',
    '!include', '!inc', '!let', '!macro', '!endmacro', '!mend', '!message',
    '!noassert', '!nopage', '!nowarn', '!page', '!pseudopc', '!realpc',
    '!serious', '!set', '!source', '!src', '!to', '!warn', '!zone'
];
AcmeFormatter.CONDITIONAL_DIRECTIVES = [
    '!if', '!ifdef', '!ifndef', '!else', '!endif'
];
//# sourceMappingURL=acme-formatter.js.map