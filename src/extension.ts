import * as vscode from 'vscode';
import { generateFakePayloadCommand } from './commands/generateFakePayload';

export function activate(context: vscode.ExtensionContext) {
    // Register the documentation command
    const docDisposable = vscode.commands.registerCommand('api-payload-generator.showDocumentation', () => {
        // Open documentation in a webview or external browser
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/Israr-11/api-payload-generator'));
        
        // Or show a quick info panel with usage instructions
        vscode.window.showInformationMessage(
            'API Payload Generator: Open a JS/TS file with Express routes, then run "Generate API Payload" command.'
        );
    });
    
    // Add to context subscriptions
    context.subscriptions.push(docDisposable);
    
    // Register the generate payload command
    generateFakePayloadCommand(context);
    
    console.log('API Payload Generator extension is now active!');
}

export function deactivate() {}
