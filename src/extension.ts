import * as vscode from 'vscode';
import { generateFakePayloadCommand } from './commands/generateFakePayload';

export function activate(context: vscode.ExtensionContext) {
    // REGISTERING THE DOCUMENTATION COMMAND
    const docDisposable = vscode.commands.registerCommand('api-payload-generator.showDocumentation', () => {

        vscode.env.openExternal(vscode.Uri.parse('https://github.com/Israr-11/payloadgen'));

        vscode.window.showInformationMessage(
            'PayloadGen: Open a JS/TS file with Mongoose schemas or request bodies, open command palette, and run "PayloadGen".',
        );
    });

    context.subscriptions.push(docDisposable);

    generateFakePayloadCommand(context);

    console.log('PayloadGen extension is now active!');
}

export function deactivate() { }
