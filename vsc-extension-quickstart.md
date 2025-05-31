# Getting Started with PayloadGen

## What's in the folder

* This folder contains all of the files necessary for the PayloadGen extension.
* `package.json` - Extension manifest file that defines the extension's metadata, commands, and dependencies.
* `src/extension.ts` - Main entry point for the extension.
* `src/core/` - Core functionality for code analysis and data generation.
* `src/ui/` - UI components for displaying generated payloads.

## Get up and running straight away

* Press `F5` to open a new window with your extension loaded.
* Open a JavaScript or TypeScript file with API code (route handlers, schemas, etc.).
* Select the code, right-click, and choose "PayloadGen: Generate API Payload".
* See the generated payload in the webview panel.

## Make changes

* You can relaunch the extension from the debug toolbar after changing code.
* You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window with your extension to load your changes.

## Explore the API

* You can open the full set of VS Code API when you open the file `node_modules/@types/vscode/index.d.ts`.

## Run tests

* Open the Debug viewlet (`Ctrl+Shift+D` or `Cmd+Shift+D` on Mac) and from the launch configuration dropdown pick `Extension Tests`.
* Press `F5` to run the tests in a new window with your extension loaded.
* See the output of the test result in the Debug Console area.
* Make changes to `src/test/extension.test.ts` or create new test files inside the `test` folder.

## Package and Publish

* To package the extension: `vsce package`
* To publish to the marketplace: `vsce publish`

## Learn more

* [VS Code Extension API](https://code.visualstudio.com/api)
* [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

