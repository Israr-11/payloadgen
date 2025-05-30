import * as assert from 'assert';
import * as vscode from 'vscode';
import { generateFakePayload } from '../core/faker';
import { SchemaField } from '../types/index';

describe('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	// TEST FOR THE "generateFakePayload" FUNCTION TO ENSURE IT WORKS AS EXPECTED
	it('generateFakePayload should generate email and name fields', () => {
		const keys: SchemaField[] = [
			{ name: 'email', type: 'String' },
			{ name: 'name', type: 'String' }
		];
		const result = generateFakePayload(keys);

		// CHECKING IF 'EMAIL' AND 'NAME' ARE PRESENT IN THE PAYLOAD
		assert.ok(result.email, 'Email field should exist');
		assert.ok(result.name, 'Name field should exist');

		assert.strictEqual(typeof result.email, 'string', 'Email should be a string');
		assert.strictEqual(typeof result.name, 'string', 'Name should be a string');
	});

	// TESTING IF THE "GENERATEFAKEPAYLOAD" FUNCTION RETURNS A DEFAULT VALUE FOR UNKNOWN KEYS
	it('generateFakePayload should handle unknown keys', () => {
		const keys: SchemaField[] = [
			{ name: 'unknownKey', type: 'Unknown' }
		];
		const result = generateFakePayload(keys);

		assert.ok(result['unknownKey'], 'Unknown key should exist');
		assert.strictEqual(typeof result['unknownKey'], 'string', 'Unknown key should be a string');
	});

	it('should execute command', async () => {
		await vscode.commands.executeCommand('extension.generateApiPayload');

		// VERIFY THAT THE COMMAND EXECUTION DOESN'T THROW AN ERROR
		assert.ok(true, 'The command should execute without errors');
	});

	// Sample test for basic assertions
	it('Sample array test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
