#!/bin/bash

# ACME Assembler VS Code Extension Installation Script

echo "Installing ACME Assembler VS Code Extension..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Compile TypeScript
echo "Compiling TypeScript..."
npm run compile

echo "Extension compiled successfully!"
echo ""
echo "To test the extension:"
echo "1. Press F5 in VS Code to open a new Extension Development Host window"
echo "2. Open any .a file in the new window to see syntax highlighting"
echo ""
echo "To package the extension:"
echo "1. Install vsce: npm install -g vsce"
echo "2. Package: vsce package"
echo "3. Install: code --install-extension acme-assembler-0.1.0.vsix"
