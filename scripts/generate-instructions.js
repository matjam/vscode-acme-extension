const fs = require('fs');
const path = require('path');

// Read the opcode file to get instruction names and addressing modes
function parseOpcodeFile(filePath, processor) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const instructions = new Map();
    
    // Skip reserved/undefined instructions
    const skipInstructions = ['RESQ', 'UNDEFINED'];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) continue;
        
        const opcode = parts[0];
        const instruction = parts[1];
        
        // Skip reserved instructions
        if (skipInstructions.includes(instruction)) continue;
        
        if (!instructions.has(instruction)) {
            instructions.set(instruction, []);
        }
        instructions.get(instruction).push({
            opcode: opcode,
            addressing: parts.slice(2).join(' '),
            processor: processor
        });
    }
    
    return instructions;
}

// Read the cycles file to get cycle information
function parseCyclesFile(filePath, processor) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const cycles = new Map();
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) continue;
        
        const opcode = parts[0];
        const cycleInfo = parts[1];
        cycles.set(opcode, {
            cycles: cycleInfo,
            processor: processor
        });
    }
    
    return cycles;
}

// Parse flags string into a map of all possible flags
function parseFlags(flagsString) {
    const allFlags = ['N', 'Z', 'I', 'C', 'D', 'V', 'E'];
    const flags = {};
    
    // Initialize all flags to false
    allFlags.forEach(flag => {
        flags[flag] = false;
    });
    
    // Parse the flags string (e.g., "N+Z+C+V+")
    const flagMatches = flagsString.match(/([NZICVDE])([+\-\.])/g) || [];
    flagMatches.forEach(match => {
        const flag = match[0];
        const status = match[1];
        if (status === '+') {
            flags[flag] = true;
        }
        // '-' and '.' both mean false (not set)
    });
    
    return flags;
}

// Convert LaTeX symbols to Unicode
function convertLaTeXSymbols(text) {
    return text
        // Convert LaTeX symbols first (before removing $)
        .replace(/\$\\[Ll]eftarrow\$/g, '←')
        .replace(/\\[Ll]eftarrow/g, '←')
        .replace(/\$\\Longrightarrow\$/g, '⟹')
        .replace(/\$\Longrightarrow\$/g, '⟹')
        .replace(/\\Longrightarrow/g, '⟹')
        // Convert LaTeX binary operation symbols
        .replace(/\\binand\{\}/g, '∧')
        .replace(/\\binor\{\}/g, '∨')
        .replace(/\\binxor\{\}/g, '⊕')
        .replace(/\\binnot\{\}/g, '¬')
        // Convert LaTeX shift symbols
        .replace(/\$\\ll\$/g, '≪')
        .replace(/\$\\gg\$/g, '≫')
        .replace(/\$\ll\$/g, '≪')
        .replace(/\$\gg\$/g, '≫')
        // Convert LaTeX math symbols
        .replace(/\$\\leftrightarrow\$/g, '↔')
        .replace(/\$\\+\$/g, '+')
        .replace(/\$\\-\$/g, '−')
        .replace(/\$\\times\$/g, '×')
        .replace(/\$\\div\$/g, '÷')
        .replace(/\$\\or\$/g, ' or ')
        .replace(/\\or/g, ' or ')
        // Remove remaining $ symbols
        .replace(/\$/g, '');
}

// Map addressing mode syntax to descriptive names
function mapAddressingMode(addressing) {
    const modeMap = {
        '($nn,X)': '(indirect,X)',
        '$nn': 'zero-page',
        '#$nn': 'immediate 8bit',
        '$nnnn': 'absolute',
        '($nn),Y': '(indirect),Y',
        '($nn),Z': '(indirect),Z',
        '$nn,X': 'zero-page,X',
        '$nnnn,Y': 'absolute,Y',
        '$nnnn,X': 'absolute,X',
        '[$nn],Z': '[indirect],Z',
        '$rr': 'relative',
        '$rrrr': '16bit relative'
    };
    
    return modeMap[addressing] || addressing || 'implied';
}

// Parse individual instruction files
function parseInstructionFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let shortDescription = '';
    let description = '';
    let operation = '';
    let operations = {}; // CPU-specific operations
    let flags = {}; // Map of all possible flags with boolean values
    let sideEffects = [];
    
    // State machine for parsing instruction files
    let state = 'shortDescription';
    let lineIndex = 0;
    
    // State 1: Process short description (line 1)
    if (lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        if (line) {
            shortDescription = line;
            state = 'operations';
            lineIndex++;
        }
    }
    
    // State 2: Check line 2 to determine if it's generic operation or CPU-specific
    if (state === 'operations' && lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        
        if (!line) {
            // Empty line - move to flags state
            state = 'flags';
            lineIndex++;
        } else if (line.startsWith('6502:') || line.startsWith('4510:') || line.startsWith('45GS02:')) {
            // This is CPU-specific operations, switch to that state
            state = 'cpu_specific_operations';
        } else {
            // This is a generic operation
            operation = convertLaTeXSymbols(line);
            state = 'flags';
            lineIndex++;
        }
    }

    // State 3: Process CPU-specific operations
    while (state === 'cpu_specific_operations' && lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        
        if (!line) {
            // Empty line - move to flags state
            state = 'flags';
            continue;
        }
        
        // Check if this is a CPU-specific operation (starts with CPU:)
        if (line.startsWith('6502:') || line.startsWith('4510:') || line.startsWith('45GS02:')) {
            const cpuMatch = line.match(/^(6502|4510|45GS02):(.+)$/);
            if (cpuMatch) {
                const cpu = cpuMatch[1];
                const opText = cpuMatch[2];
                operations[cpu] = convertLaTeXSymbols(opText);
            }
            lineIndex++;
            // Stay in cpu_specific_operations state to process more CPU operations
            continue;
        }
        
        // If we get here, this line doesn't have a CPU prefix
        // It's either a generic operation or the start of flags/description
        // For now, treat it as a generic operation and move to flags
        operation = convertLaTeXSymbols(line);
        state = 'flags';
        lineIndex++;
        continue;
    }
    
    // State 4: Process flags (next line after operations)
    if (state === 'flags' && lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        
        
        if (!line) {
            // Empty line - no flags set
            state = 'description';
            lineIndex++;
        } else {
            // This line is flags
            flags = parseFlags(line);
            state = 'description';
            lineIndex++;
        }
    }
    
    // State 5: Process description (everything after flags)
    let currentSection = 'description';
    for (let i = lineIndex; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        
        // Handle empty lines for paragraph breaks
        if (!trimmed) {
            if (currentSection === 'description' && description && !description.endsWith('\n\n')) {
                description += '\n\n';
            }
            continue;
        }
        
        if (trimmed.includes('Side effects')) {
            currentSection = 'sideEffects';
            continue;
        }
        
        if (currentSection === 'sideEffects' && trimmed.startsWith('\\item')) {
            const effect = trimmed.replace('\\item', '').trim()
                .replace(/\\leftarrow/g, '←')
                .replace(/\$/g, '')
                .replace(/\\cdot/g, '·');
            sideEffects.push(effect);
        } else if (currentSection === 'description') {
            // Handle "Special" sections
            if (trimmed === 'Special') {
                if (description) description += '\n\n**Special:**\n';
                continue;
            }
            
            // Handle verbatim blocks
            if (trimmed === '\\begin{verbatim}') {
                if (description) description += '\n\n<pre>';
                continue;
            }
            if (trimmed === '\\end{verbatim}') {
                if (description) description += '</pre>\n\n';
                continue;
            }
            
            // Clean up LaTeX formatting
            const cleanLine = trimmed
                // Convert LaTeX symbols first (before removing $)
                .replace(/\$\\[Ll]eftarrow\$/g, '←')
                .replace(/\\[Ll]eftarrow/g, '←')
                .replace(/\\cdot/g, '·')
                .replace(/\\subsubsection\*\{[^}]*\}/g, '')
                .replace(/\\begin\{itemize\}/g, '')
                .replace(/\\end\{itemize\}/g, '')
                .replace(/\\ref\{[^}]+\}/g, 'the Mega65 Book')
                .replace(/Appendix \\ref\{[^}]+\}/g, 'the Mega65 Book')
                // Convert LaTeX binary operation symbols
                .replace(/\\binand\{\}/g, '∧')
                .replace(/\\binor\{\}/g, '∨')
                .replace(/\\binxor\{\}/g, '⊕')
                .replace(/\\binnot\{\}/g, '¬')
                // Convert LaTeX shift symbols
                .replace(/\$\\ll\$/g, '≪')
                .replace(/\$\\gg\$/g, '≫')
                .replace(/\$\ll\$/g, '≪')
                .replace(/\$\gg\$/g, '≫')
                // Convert LaTeX math symbols
                .replace(/\$\\leftrightarrow\$/g, '↔')
                .replace(/\$\\+\$/g, '+')
                .replace(/\$\\-\$/g, '−')
                .replace(/\$\\times\$/g, '×')
                .replace(/\$\\div\$/g, '÷')
                // Remove remaining $ symbols
                .replace(/\$/g, '');
            
            if (cleanLine && !cleanLine.match(/^\\[a-zA-Z]+/)) {
                // Add to description
                if (description) {
                    // Check if we're inside a verbatim block
                    if (description.includes('<pre>') && !description.includes('</pre>')) {
                        // Inside verbatim block - preserve newlines
                        description += '\n' + cleanLine;
                    } else {
                        // Regular text - just add space between lines
                        description += ' ' + cleanLine;
                    }
                } else {
                    description = cleanLine;
                }
            }
        }
    }
    
    const result = {
        shortDescription: shortDescription || 'No short description available',
        description: description || 'No description available',
        operation: operation || 'No operation specified',
        operations: operations,
        flags: Object.keys(flags).length > 0 ? flags : undefined,
        sideEffects: sideEffects
    };
    
    
    return result;
}

// Update TextMate grammar with instruction list
function updateTextMateGrammar(instructionNames) {
    const grammarPath = path.join(__dirname, '..', 'syntaxes', 'acme.tmLanguage.json');
    const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
    
    // Create instruction pattern - sort for consistent output and convert to lowercase
    // Use case-insensitive matching with (?i) flag
    const sortedInstructions = instructionNames.map(name => name.toLowerCase()).sort();
    const instructionPattern = `(?i)\\b(${sortedInstructions.join('|')})\\b`;
    
    // Find and update the instruction pattern
    // The instruction pattern is nested under instructions.patterns
    if (grammar.repository && grammar.repository.instructions && grammar.repository.instructions.patterns) {
        const patterns = grammar.repository.instructions.patterns;
        for (let i = 0; i < patterns.length; i++) {
            if (patterns[i].name === 'keyword.control.instruction.acme') {
                patterns[i].match = instructionPattern;
                break;
            }
        }
    } else {
        console.log('Warning: Could not find instruction pattern in grammar structure');
    }
    
    // Write back the updated grammar
    fs.writeFileSync(grammarPath, JSON.stringify(grammar, null, 2));
    console.log(`Updated TextMate grammar with ${instructionNames.length} instructions`);
}

// Main function
function generateInstructions() {
    const instructionSetsDir = path.join(__dirname, '..', 'instruction_sets');
    const outputPath = path.join(__dirname, '..', 'docs', 'instructions.json');
    
    // Parse all opcode and cycle files
    const allOpcodes = new Map();
    const allCycles = new Map();
    
    // Process 6502
    const opcodes6502 = parseOpcodeFile(path.join(instructionSetsDir, '6502.opc'), '6502');
    const cycles6502 = parseCyclesFile(path.join(instructionSetsDir, '6502.cycles'), '6502');
    
    // Process 4510
    const opcodes4510 = parseOpcodeFile(path.join(instructionSetsDir, '4510.opc'), '4510');
    const cycles4510 = parseCyclesFile(path.join(instructionSetsDir, '4510.cycles'), '4510');
    
    // Process 45GS02
    const opcodes45GS02 = parseOpcodeFile(path.join(instructionSetsDir, '45GS02.opc'), '45GS02');
    const cycles45GS02 = parseCyclesFile(path.join(instructionSetsDir, '45GS02.cycles'), '45GS02');
    
    // Merge all opcodes and cycles
    for (const [instruction, data] of opcodes6502) {
        if (!allOpcodes.has(instruction)) {
            allOpcodes.set(instruction, []);
        }
        allOpcodes.get(instruction).push(...data);
    }
    
    for (const [instruction, data] of opcodes4510) {
        if (!allOpcodes.has(instruction)) {
            allOpcodes.set(instruction, []);
        }
        allOpcodes.get(instruction).push(...data);
    }
    
    for (const [instruction, data] of opcodes45GS02) {
        if (!allOpcodes.has(instruction)) {
            allOpcodes.set(instruction, []);
        }
        allOpcodes.get(instruction).push(...data);
    }
    
    // Merge cycles
    for (const [opcode, data] of cycles6502) {
        allCycles.set(opcode, data);
    }
    for (const [opcode, data] of cycles4510) {
        allCycles.set(opcode, data);
    }
    for (const [opcode, data] of cycles45GS02) {
        allCycles.set(opcode, data);
    }
    
    const instructions = {};
    
    // Process each instruction
    for (const [instructionName, opcodeData] of allOpcodes) {
        const instructionFile = path.join(instructionSetsDir, `inst.${instructionName}`);
        
        if (!fs.existsSync(instructionFile)) {
            console.log(`Warning: No instruction file for ${instructionName}`);
            continue;
        }
        
        const instructionInfo = parseInstructionFile(instructionFile);
        
        // Build addressing modes grouped by processor
        const addressingModes = [];
        const processors = new Set();
        
        for (const data of opcodeData) {
            const cycleInfo = allCycles.get(data.opcode);
            addressingModes.push({
                mode: mapAddressingMode(data.addressing),
                syntax: `${instructionName} ${data.addressing || ''}`.trim(),
                opcode: data.opcode,
                cycles: cycleInfo ? cycleInfo.cycles : '?',
                processor: data.processor
            });
            processors.add(data.processor);
        }
        
        // Determine which processors support this instruction
        const supportedProcessors = Array.from(processors).sort();
        
        instructions[instructionName] = {
            name: instructionName,
            shortDescription: instructionInfo.shortDescription || 'No short description available',
            description: instructionInfo.description || 'No description available',
            operation: instructionInfo.operation || 'No operation specified',
            operations: instructionInfo.operations,
            flags: instructionInfo.flags || 'No flags specified',
            sideEffects: instructionInfo.sideEffects,
            processors: supportedProcessors,
            addressingModes: addressingModes
        };
    }
    
    // Write the output
    const output = {
        instructions: instructions
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Generated instructions.json with ${Object.keys(instructions).length} instructions`);
    console.log(`Processors: 6502, 4510, 45GS02`);
    
    // Update TextMate grammar with all discovered instructions
    const instructionNames = Object.keys(instructions);
    updateTextMateGrammar(instructionNames);
}

// Run the script
generateInstructions();
