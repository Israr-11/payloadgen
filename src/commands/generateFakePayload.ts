import * as vscode from 'vscode';
import { extractKeysFromCode } from '../core/extractor';
import { generateFakePayload } from '../core/faker';
import { PayloadPanel } from '../ui/PayloadPanel';

export const generateFakePayloadCommand = (context: vscode.ExtensionContext) => {
    const disposable = vscode.commands.registerCommand('extension.generateApiPayload', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Get selected text or entire document
            let code: string;
            if (editor.selection.isEmpty) {
                code = editor.document.getText();
            } else {
                code = editor.document.getText(editor.selection);
            }
            
            // Show panel immediately with loading message
            const panel = PayloadPanel.createOrShow(context.extensionUri);
            panel.updatePayload("Loading... Please wait while we analyze your schema...");
            
            // Extract keys from the code asynchronously
            setTimeout(() => {
                try {
                    const keys = extractKeysFromCode(code);
                    if (keys.length === 0) {
                        panel.updatePayload("No keys found in the selected code. Please select a valid schema or API endpoint.");
                        vscode.window.showWarningMessage('No keys found in the selected code.');
                        return;
                    }
                    
                    // Generate fake payload
                    const fakePayload = generateFakePayload(keys);
                    
                    // Format the payload as JSON with indentation
                    const formattedPayload = JSON.stringify(fakePayload, null, 2);
                    
                    // Update the panel with the generated payload
                    panel.updatePayload(formattedPayload);
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    panel.updatePayload(`Error generating payload: ${errorMessage}`);
                    vscode.window.showErrorMessage('Error generating payload.');
                }
            }, 0);
            
            // Set up message handler for the panel
            panel.setMessageHandler(
                (message: any) => {
                    switch (message.command) {
                        case 'copied':
                            vscode.window.showInformationMessage('Payload copied to clipboard!');
                            return;
                        case 'save':
                            savePayload(message.payload);
                            return;
                        case 'error':
                            vscode.window.showErrorMessage(message.text);
                            return;
                    }
                }
            );
        } else {
            vscode.window.showWarningMessage('No active editor found. Please open a file.');
        }
    });
    
    context.subscriptions.push(disposable);
    return disposable;
};

async function savePayload(payload: string) {
    const uri = await vscode.window.showSaveDialog({
        filters: {
            'JSON': ['json']
        },
        saveLabel: 'Save Payload'
    });
    
    if (uri) {
        await vscode.workspace.fs.writeFile(
            uri,
            Buffer.from(payload, 'utf8')
        );
        vscode.window.showInformationMessage('Payload saved successfully!');
    }
}
