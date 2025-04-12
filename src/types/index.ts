export type FakePayload = {
    [key: string]: string; // This means that the keys of the object will be strings and their values will also be strings.
};


// Define a type for extracted fields with their types
export interface SchemaField {
  name: string;
  type: 'String' | 'Number' | 'Boolean' | 'Date' | 'Array' | 'Object' | 'Unknown' | 'ObjectId';
  enum?: string[];
  nestedFields?: SchemaField[];
  ref?: string;  // Add this to store the referenced model
}