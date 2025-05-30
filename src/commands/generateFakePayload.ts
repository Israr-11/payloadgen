import * as vscode from 'vscode';
import { extractKeysFromCode } from '../core/extractor';
import { generateFakePayload } from '../core/faker';
import { PayloadPanel } from '../ui/PayloadPanel';

export const generateFakePayloadCommand = (context: vscode.ExtensionContext) => {
    const disposable = vscode.commands.registerCommand('extension.generateApiPayload', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                // CREATING AND SHOWING PANEL IMMEDIATELY WITH LOADING MESSAGE
                const panel = PayloadPanel.createOrShow(context.extensionUri);
                panel.updatePayload("Loading... Please wait while we analyze your schema...");

                // GET SELECTED TEXT OR ENTIRE DOCUMENT
                let code: string;
                if (editor.selection.isEmpty) {
                    code = editor.document.getText();
                } else {
                    code = editor.document.getText(editor.selection);
                }

                // PROCESS IN THE NEXT EVENT LOOP TICK TO ALLOW UI TO UPDATE
                setTimeout(async () => {
                    try {
                        vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: "Generating API payload",
                            cancellable: false
                        }, async (progress) => {
                            progress.report({ increment: 30, message: "Analyzing code..." });

                            // EXTRACTING KEYS FROM THE CODE
                            const keys = extractKeysFromCode(code);
                            if (keys.length === 0) {
                                panel.updatePayload("No keys found in the selected code. Please select a valid schema or API endpoint.");
                                vscode.window.showWarningMessage('No keys found in the selected code.');
                                return;
                            }

                            progress.report({ increment: 30, message: "Generating payload..." });

                            // GENERATING FAKE PAYLOAD
                            const fakePayload = generateFakePayload(keys);

                            progress.report({ increment: 40, message: "Formatting result..." });

                            const formattedPayload = JSON.stringify(fakePayload, null, 2);

                            // UPDATING THE PANEL WITH THE GENERATED PAYLOAD
                            panel.updatePayload(formattedPayload);

                            return;
                        });
                    } catch (error: any) {
                        panel.updatePayload(`Error generating payload: ${error.message || 'Unknown error'}`);
                        vscode.window.showErrorMessage(`Error generating payload: ${error.message || 'Unknown error'}`);
                    }
                }, 10);

                panel.setMessageHandler(message => {
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
                });
            } else {
                vscode.window.showWarningMessage('No active editor found. Please open a file.');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error executing command: ${error.message || 'Unknown error'}`);
        }
    });

    context.subscriptions.push(disposable);
    return disposable;
};

async function savePayload(payload: string) {
    try {
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
    } catch (error: any) {
        vscode.window.showErrorMessage(`Error saving payload: ${error.message || 'Unknown error'}`);
    }
}
