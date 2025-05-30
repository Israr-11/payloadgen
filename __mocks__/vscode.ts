import 'jest';

export const window = {
    // RETURNING THE INPUT MESSAGE INSTEAD OF "OK"
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
