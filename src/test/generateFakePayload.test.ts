import { generateFakePayload } from '../core/faker'; 
import { SchemaField } from '../types/index';

describe('generateFakePayload', () => {
  it('should generate an object with the given keys', () => {
    const keys: SchemaField[] = [
      { name: 'email', type: 'String' },
      { name: 'name', type: 'String' }
    ];
    const result = generateFakePayload(keys);

    expect(result).toHaveProperty('email');
    expect(result).toHaveProperty('name');
    expect(typeof result.email).toBe('string');
    expect(typeof result.name).toBe('string');
  });

  it('should generate default values for missing keys', () => {
    const keys: SchemaField[] = [
      { name: 'unknownKey', type: 'Unknown' }
    ];
    const result = generateFakePayload(keys);

    expect(result).toHaveProperty('unknownKey');
    expect(typeof result.unknownKey).toBe('string');
  });
  
  // Add a new test for different data types
  it('should generate appropriate values based on field type', () => {
    const keys: SchemaField[] = [
      { name: 'stringField', type: 'String' },
      { name: 'numberField', type: 'Number' },
      { name: 'booleanField', type: 'Boolean' },
      { name: 'dateField', type: 'Date' },
      { name: 'arrayField', type: 'Array' },
      { name: 'objectField', type: 'Object' }
    ];
    const result = generateFakePayload(keys);

    expect(typeof result.stringField).toBe('string');
    expect(typeof result.numberField).toBe('number');
    expect(typeof result.booleanField).toBe('boolean');
    expect(typeof result.dateField).toBe('string'); // ISO date string
    expect(Array.isArray(result.arrayField)).toBe(true);
    expect(typeof result.objectField).toBe('object');
    expect(result.objectField).not.toBeNull();
  });
  
  // Add a test for enum values
  it('should use enum values when available', () => {
    const keys: SchemaField[] = [
      { name: 'role', type: 'String', enum: ['admin', 'user', 'guest'] }
    ];
    const result = generateFakePayload(keys);

    expect(result).toHaveProperty('role');
    expect(['admin', 'user', 'guest']).toContain(result.role);
  });
});
