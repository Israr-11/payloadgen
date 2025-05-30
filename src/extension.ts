import * as vscode from 'vscode';
import { generateFakePayloadCommand } from './commands/generateFakePayload';

export function activate(context: vscode.ExtensionContext) {
    // REGISTERING THE DOCUMENTATION COMMAND
    const docDisposable = vscode.commands.registerCommand('api-payload-generator.showDocumentation', () => {

        vscode.env.openExternal(vscode.Uri.parse('https://github.com/Israr-11/api-payload-generator'));

        vscode.window.showInformationMessage(
            'API Payload Generator: Open a JS/TS file with Express routes, then run "Generate API Payload" command.'
        );
    });

    context.subscriptions.push(docDisposable);

    generateFakePayloadCommand(context);

    console.log('API Payload Generator extension is now active!');
}

export function deactivate() { }
