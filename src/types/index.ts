export type FakePayload = {
  [key: string]: string | number | boolean | object | any[];
};

// EXTRACTED FILEDS WITH THEIR TYPES
export interface SchemaField {
  name: string;
  type: 'String' | 'Number' | 'Boolean' | 'Date' | 'Array' | 'Object' | 'Unknown' | 'ObjectId' | 'Buffer' | 'Map';
  enum?: string[];
  nestedFields?: SchemaField[];
  ref?: string;
}
