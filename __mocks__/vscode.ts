// __mocks__/vscode.ts
import 'jest';

export const window = {
    // Return the input message instead of always returning "OK"
    showInformationMessage: jest.fn().mockImplementation((message: any) => Promise.resolve(message)),
};

export const commands = {
    executeCommand: jest.fn().mockResolvedValue(true),
};

export const workspace = {
    getConfiguration: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue('fake value'),
    }),
};
