import * as assert from 'assert';
import * as vscode from 'vscode';
import { generateFakePayload } from '../core/faker'; 
import { SchemaField } from '../types/index';

// Remove this line
// const { suite, test } = require('mocha');

// Replace 'suite' with 'describe' and 'test' with 'it'
describe('Extension Test Suite', () => {

	// Start by showing a message to indicate the tests are running
	vscode.window.showInformationMessage('Start all tests.');

	// Test for the "generateFakePayload" function to ensure it works as expected
	it('generateFakePayload should generate email and name fields', () => {
		const keys: SchemaField[] = [
			{ name: 'email', type: 'String' },
			{ name: 'name', type: 'String' }
		];
		const result = generateFakePayload(keys);
		
		// Check if 'email' and 'name' are present in the payload
		assert.ok(result.email, 'Email field should exist');
		assert.ok(result.name, 'Name field should exist');
		
		// Validate that the email and name are strings
		assert.strictEqual(typeof result.email, 'string', 'Email should be a string');
		assert.strictEqual(typeof result.name, 'string', 'Name should be a string');
	});

	// Test if the "generateFakePayload" function returns a default value for unknown keys
	it('generateFakePayload should handle unknown keys', () => {
		const keys: SchemaField[] = [
			{ name: 'unknownKey', type: 'Unknown' }
		];
		const result = generateFakePayload(keys);
		
		// Check if the unknown key exists in the result, and it should be a string
		assert.ok(result['unknownKey'], 'Unknown key should exist');
		assert.strictEqual(typeof result['unknownKey'], 'string', 'Unknown key should be a string');
	});

	// Test if VSCode commands are working (for example, the "helloWorld" command)
	it('should execute helloWorld command', async () => {
		// Activate the command from your extension
		await vscode.commands.executeCommand('api-payload-generator.helloWorld');
		
		// Verify that the command shows the expected information message in the VSCode UI
		const message = await vscode.window.showInformationMessage('Hello, World!');
		assert.strictEqual(message, 'Hello, World!', 'The "helloWorld" command should show the expected message.');
	});

	// Sample test for basic assertions
	it('Sample array test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
