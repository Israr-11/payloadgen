import * as vscode from 'vscode';

export class PayloadPanel {
  public static currentPanel: PayloadPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _extensionUri: vscode.Uri;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent('');
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (PayloadPanel.currentPanel) {
      PayloadPanel.currentPanel._panel.reveal(column);
      return PayloadPanel.currentPanel;
    }

    // CREATING A NEW PANEL WITH EMOJI IN THE TITLE
    const panel = vscode.window.createWebviewPanel(
      'apiPayloadGenerator',
      'PayloadGen ❴ ⚡ ❵',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'resources')
        ]
      }
    );

    PayloadPanel.currentPanel = new PayloadPanel(panel, extensionUri);
    return PayloadPanel.currentPanel;
  }

  public updatePayload(payload: any) {
    // HANDLING DIFFERENT PAYLOAD TYPES APPROPRIATELY
    let processedPayload: string;

    if (typeof payload === 'string') {
      // IF PAYLOAD IS STRING, USE IT DIRECTLY
      processedPayload = payload;
    } else {
      // IF IT IS OBJECT, STRINGIFY IT WITH PROPER FORMATTING
      processedPayload = JSON.stringify(payload, null, 2);
    }

    this._panel.webview.html = this._getWebviewContent(processedPayload);
  }

  // ADDING A PUBLIC METHOD TO SET UP MESSAGE HANDLING
  public setMessageHandler(handler: (message: any) => void) {
    this._panel.webview.onDidReceiveMessage(handler, undefined, this._disposables);
  }

  public onDidReceiveMessage(handler: (message: any) => void) {
    this._panel.webview.onDidReceiveMessage(handler, undefined, this._disposables);
  }

  private _getWebviewContent(payload: string) {
    // CHECKING IF THE MESSAGE IS LOADING
    const isLoading = payload.startsWith("Loading...");

    // ONLY TRYING TO FORMAT THE MESSAGE IF IT IS NOT A LOADING MESSAGE
    let formattedPayload = payload;

    if (!isLoading && payload) {
      try {

        if (payload.trim().startsWith('{') || payload.trim().startsWith('[')) {
          // PARSING AND RE-STRINGIFYING TO ENSURE PROPER FORMATTING
          const jsonObj = JSON.parse(payload);
          formattedPayload = JSON.stringify(jsonObj, null, 2);
        }
      } catch (e) {
        // IF PARSING FAILS, USE THE ORIGINAL PAYLOAD
        console.error("Failed to parse JSON:", e);
        formattedPayload = payload;
      }
    }

    // APPLYING SYNTAX HIGHLIGHTING TO THE JSON
    const displayContent = isLoading
      ? formattedPayload
      : this._highlightJson(formattedPayload);

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PayloadGen</title>
        <style>
            body {
                font-family: var(--vscode-editor-font-family);
                font-size: var(--vscode-editor-font-size);
                padding: 0;
                margin: 0;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .container {
                padding: 20px;
            }
            pre {
                background-color: var(--vscode-editor-background);
                padding: 15px;
                border-radius: 6px;
                overflow: auto;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                margin: 0;
                line-height: 1.5;
            }
            .toolbar {
                display: flex;
                justify-content: flex-end;
                padding: 12px;
                background-color: var(--vscode-editor-background);
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-left: 12px;
                font-weight: 500;
                transition: background-color 0.2s;
            }
            button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            h2 {
                color: var(--vscode-editor-foreground);
                margin-top: 0;
                font-size: 1.4em;
                margin-bottom: 16px;
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 8px;
                display: flex;
                align-items: center;
            }
            
            .json-string { 
                color: #ce9178; 
            }
            .json-number { 
                color: #b5cea8; 
            }
            .json-boolean { 
                color: #569cd6; 
                font-weight: bold;
            }
            .json-null { 
                color: #569cd6; 
                font-weight: bold;
            }
            .json-key { 
                color: #0078d7; 
                font-weight: bold;
            }
            .json-punctuation { 
                color: #d4d4d4; 
            }
            
            @keyframes flash {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }
            .copy-feedback {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                display: none;
                animation: flash 1.5s ease-out;
            }
            
            .spinner {
                border: 4px solid rgba(0, 0, 0, 0.1);
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border-left-color: var(--vscode-button-background);
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="toolbar">
            ${!isLoading ? `<button id="copyBtn">📋 Copy to Clipboard</button>
            <button id="saveBtn">💾 Save to File</button>` : ''}
        </div>
        <div class="container">
            <h2>Generated API Payload ❴ ⚡ ❵</h2>
            ${isLoading ?
        `<p>${formattedPayload}</p><div class="spinner"></div>` :
        `<pre id="payload">${displayContent}</pre>`
      }
        </div>
        <div class="copy-feedback" id="copyFeedback">Copied to clipboard!</div>
        <script>
            const vscode = acquireVsCodeApi();
            
            ${!isLoading ? `
            const rawPayload = ${JSON.stringify(formattedPayload)};
            
            document.getElementById('copyBtn').addEventListener('click', () => {
                navigator.clipboard.writeText(rawPayload)
                    .then(() => {
                        const feedback = document.getElementById('copyFeedback');
                        feedback.style.display = 'block';
                        setTimeout(() => {
                            feedback.style.display = 'none';
                        }, 1500);
                        
                        vscode.postMessage({ command: 'copied' });
                    })
                    .catch(err => {
                        vscode.postMessage({ command: 'error', text: 'Failed to copy: ' + err });
                    });
            });
            
            document.getElementById('saveBtn').addEventListener('click', () => {
                vscode.postMessage({ 
                    command: 'save', 
                    payload: rawPayload
                });
            });` : ''}
        </script>
    </body>
    </html>`;
  }

  // METHOD TO HIGHLIGHT JSON SYNTAX
  private _highlightJson(json: string): string {
    if (!json) { return ''; }

    return json
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
            match = match.replace(/:$/, '');
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }

        // FOR KEYS, ADD THE COLON BACK WITH PUNCTUATION STYLING
        if (cls === 'json-key') {
          return `<span class="${cls}">${this._escapeHtml(match)}</span><span class="json-punctuation">:</span>`;
        }

        return `<span class="${cls}">${this._escapeHtml(match)}</span>`;
      })
      // ADDING COLORING TO BRACKETS AND COMMAS
      .replace(/[{}[\],]/g, function (match) {
        return `<span class="json-punctuation">${match}</span>`;
      });
  }

  private _escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  public dispose() {
    PayloadPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
