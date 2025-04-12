import * as ts from 'ts-morph';
import { SchemaField } from '../types/index';

export function extractKeysFromCode(code: string): SchemaField[] {
  const fields: SchemaField[] = [];
  
  try {
    // Create a source file from the code
    const project = new ts.Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('temp.ts', code);
    
    // Find destructuring patterns: const { field1, field2 } = req.body
    const destructuringDeclarations = sourceFile.getDescendantsOfKind(ts.SyntaxKind.VariableDeclaration)
      .filter(declaration => {
        const initializer = declaration.getInitializer();
        if (!initializer) return false;
        
        // Check if it's a property access expression (req.body)
        if (ts.Node.isPropertyAccessExpression(initializer)) {
          const propAccess = initializer.asKind(ts.SyntaxKind.PropertyAccessExpression);
          if (propAccess && propAccess.getName() === 'body') {
            return true;
          }
        }
        return false;
      });
    
    // Extract field names from destructuring patterns
    destructuringDeclarations.forEach(declaration => {
      const bindingPattern = declaration.getChildrenOfKind(ts.SyntaxKind.ObjectBindingPattern)[0];
      if (bindingPattern) {
        const elements = bindingPattern.getElements();
        elements.forEach(element => {
          const name = element.getName();
          if (name) fields.push({ name, type: 'Unknown' });
        });
      }
    });
    
    // Find direct property access: req.body.fieldName
    const propertyAccesses = sourceFile.getDescendantsOfKind(ts.SyntaxKind.PropertyAccessExpression)
      .filter(propAccess => {
        const expression = propAccess.getExpression();
        if (ts.Node.isPropertyAccessExpression(expression)) {
          const parentPropAccess = expression.asKind(ts.SyntaxKind.PropertyAccessExpression);
          if (parentPropAccess && parentPropAccess.getName() === 'body') {
            return true;
          }
        }
        return false;
      });
    
    // Extract field names from direct property access
    propertyAccesses.forEach(propAccess => {
      const name = propAccess.getName();
      if (name) fields.push({ name, type: 'Unknown' });
    });
    
    // If no fields found, try to extract from Mongoose schema
    if (fields.length === 0) {
      // Find schema definitions
      const objectLiteralExpressions = sourceFile.getDescendantsOfKind(ts.SyntaxKind.ObjectLiteralExpression);
      
      for (const objLiteral of objectLiteralExpressions) {
        // Check if this is part of a mongoose schema
        const parent = objLiteral.getParent();
        if (parent && parent.getText().includes('mongoose.Schema') || parent.getText().includes('new Schema')) {
          // Extract property names and types from the schema
          const properties = objLiteral.getProperties();
          for (const prop of properties) {
            if (ts.Node.isPropertyAssignment(prop)) {
              const propName = prop.getName();
              if (propName) {
                const propValue = prop.getInitializer();
                let fieldType: SchemaField['type'] = 'Unknown';
                let enumValues: string[] | undefined;
                let nestedFields: SchemaField[] | undefined;
                let refModel: string | undefined;
                
                if (propValue && ts.Node.isObjectLiteralExpression(propValue)) {
                  // Check if this is a nested object with its own fields
                  const typeProperty = propValue.getProperty('type');
                  
                  if (typeProperty && ts.Node.isPropertyAssignment(typeProperty)) {
                    // This is a field with a type definition
                    const typeValue = typeProperty.getInitializer();
                    if (typeValue) {
                      const typeText = typeValue.getText();
                      if (typeText.includes('String')) fieldType = 'String';
                      else if (typeText.includes('Number')) fieldType = 'Number';
                      else if (typeText.includes('Boolean')) fieldType = 'Boolean';
                      else if (typeText.includes('Date')) fieldType = 'Date';
                      else if (typeText.includes('Array')) fieldType = 'Array';
                      else if (typeText.includes('Object')) fieldType = 'Object';
                      // Add this condition to detect ObjectId references
                      else if (typeText.includes('ObjectId') || typeText.includes('Schema.Types.ObjectId')) {
                        fieldType = 'ObjectId';
                        
                        // Extract the referenced model from the 'ref' property
                        const refProperty = propValue.getProperty('ref');
                        if (refProperty && ts.Node.isPropertyAssignment(refProperty)) {
                          const refValue = refProperty.getInitializer();
                          if (refValue && ts.Node.isStringLiteral(refValue)) {
                            refModel = refValue.getLiteralValue();
                          } else {
                            // Handle non-string literal ref values
                            refModel = refProperty.getInitializer()?.getText().replace(/['"]/g, '');
                          }
                        }
                      }
                    }
                    
                    // Extract enum values if present
                    const enumProperty = propValue.getProperty('enum');
                    if (enumProperty && ts.Node.isPropertyAssignment(enumProperty)) {
                      const enumValue = enumProperty.getInitializer();
                      if (enumValue) {
                        if (ts.Node.isArrayLiteralExpression(enumValue)) {
                          enumValues = enumValue.getElements()
                            .map(element => {
                              if (ts.Node.isStringLiteral(element)) {
                                return element.getLiteralValue();
                              }
                              return element.getText().replace(/['"]/g, '');
                            });
                        } else if (enumValue.getText().includes('Object.values')) {
                          // Handle Object.values(SomeEnum) pattern
                          enumValues = ['ENUM_VALUE_PLACEHOLDER'];
                        }
                      }
                    }
                  } else {
                    // This might be a nested object without a type property
                    fieldType = 'Object';
                    nestedFields = [];
                    
                    // Process nested properties
                    const nestedProperties = propValue.getProperties();
                    for (const nestedProp of nestedProperties) {
                      if (ts.Node.isPropertyAssignment(nestedProp)) {
                        const nestedPropName = nestedProp.getName();
                        if (nestedPropName) {
                          const nestedPropValue = nestedProp.getInitializer();
                          let nestedFieldType: SchemaField['type'] = 'Unknown';
                          let nestedRefModel: string | undefined;
                          
                          if (nestedPropValue && ts.Node.isObjectLiteralExpression(nestedPropValue)) {
                            // Extract type from nested property
                            const nestedTypeProperty = nestedPropValue.getProperty('type');
                            if (nestedTypeProperty && ts.Node.isPropertyAssignment(nestedTypeProperty)) {
                              const nestedTypeValue = nestedTypeProperty.getInitializer();
                              if (nestedTypeValue) {
                                const nestedTypeText = nestedTypeValue.getText();
                                if (nestedTypeText.includes('String')) nestedFieldType = 'String';
                                else if (nestedTypeText.includes('Number')) nestedFieldType = 'Number';
                                else if (nestedTypeText.includes('Boolean')) nestedFieldType = 'Boolean';
                                else if (nestedTypeText.includes('Date')) nestedFieldType = 'Date';
                                else if (nestedTypeText.includes('Array')) nestedFieldType = 'Array';
                                else if (nestedTypeText.includes('Object')) nestedFieldType = 'Object';
                                else if (nestedTypeText.includes('ObjectId') || nestedTypeText.includes('Schema.Types.ObjectId')) {
                                  nestedFieldType = 'ObjectId';
                                  
                                  // Extract the referenced model from the 'ref' property
                                  const nestedRefProperty = nestedPropValue.getProperty('ref');
                                  if (nestedRefProperty && ts.Node.isPropertyAssignment(nestedRefProperty)) {
                                    const nestedRefValue = nestedRefProperty.getInitializer();
                                    if (nestedRefValue && ts.Node.isStringLiteral(nestedRefValue)) {
                                      nestedRefModel = nestedRefValue.getLiteralValue();
                                    } else {
                                      nestedRefModel = nestedRefProperty.getInitializer()?.getText().replace(/['"]/g, '');
                                    }
                                  }
                                }
                              }
                            }
                          }
                          
                          nestedFields.push({
                            name: nestedPropName,
                            type: nestedFieldType,
                            ref: nestedRefModel
                          });
                        }
                      }
                    }
                  }
                }
                
                fields.push({ 
                  name: propName, 
                  type: fieldType,
                  enum: enumValues,
                  nestedFields: nestedFields,
                  ref: refModel
                });
              }
            }
          }
        }
      }
    }
    
    // Add TypeScript-specific extraction as a fallback
    if (fields.length === 0) {
      // Try to extract from TypeScript Mongoose models
      fields.push(...extractFieldsFromTypeScriptModel(code));
    }
    
  } catch (error) {
    console.error('Error extracting keys:', error);
    
    // Fallback to regex-based extraction if ts-morph fails
    fields.push(...extractFieldsWithRegex(code));
    
    // If regex extraction fails too, try TypeScript-specific extraction
    if (fields.length === 0) {
      fields.push(...extractFieldsFromTypeScriptModel(code));
    }
  }
  return fields;
}


function extractFieldsWithRegex(code: string): SchemaField[] {
  const fields: SchemaField[] = [];
  
  // Match destructuring patterns: const { field1, field2 } = req.body
  const destructuringRegex = /const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.body/g;
  let match;
  
  while ((match = destructuringRegex.exec(code)) !== null) {
    if (match[1]) {
      // Split the matched fields and clean them
      const fieldNames = match[1].split(',').map(field => field.trim().split(':')[0].trim());
      fields.push(...fieldNames.map(name => ({ name, type: 'Unknown' as const })));
    }
  }
  
  // Match direct property access: req.body.fieldName
  const propertyAccessRegex = /req\.body\.(\w+)/g;
  while ((match = propertyAccessRegex.exec(code)) !== null) {
    if (match[1]) {
      fields.push({ name: match[1], type: 'Unknown' as const });
    }
  }
  
  // Match Mongoose schema fields with types
  const schemaRegex = /new\s+(?:Schema|mongoose\.Schema)\s*\(\s*\{([^}]*)\}/gs;
  const schemaMatch = schemaRegex.exec(code);
  
  if (schemaMatch && schemaMatch[1]) {
    const schemaContent = schemaMatch[1];
    
    // Match field definitions like: fieldName: { type: String, ... }
    const fieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*(\w+)/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(schemaContent)) !== null) {
      const name = fieldMatch[1];
      const typeStr = fieldMatch[2];
      
      let type: SchemaField['type'] = 'Unknown';
      if (typeStr === 'String') type = 'String';
      else if (typeStr === 'Number') type = 'Number';
      else if (typeStr === 'Boolean') type = 'Boolean';
      else if (typeStr === 'Date') type = 'Date';
      else if (typeStr === 'Array') type = 'Array';
      else if (typeStr === 'Object') type = 'Object';
      
      // Check for enum values
      const enumRegex = new RegExp(`${name}\\s*:\\s*\\{[^}]*enum\\s*:\\s*\\[([^\\]]+)\\]`, 'g');
      const enumMatch = enumRegex.exec(schemaContent);
      let enumValues: string[] | undefined;
      
      if (enumMatch && enumMatch[1]) {
        enumValues = enumMatch[1].split(',')
          .map(val => val.trim().replace(/['"]/g, ''));
      }
      
      // Check for nested objects
      const nestedObjectRegex = new RegExp(`${name}\\s*:\\s*\\{([^}]*)}`, 'g');
      const nestedMatch = nestedObjectRegex.exec(schemaContent);
      let nestedFields: SchemaField[] | undefined;
      
      if (nestedMatch && nestedMatch[1] && !nestedMatch[1].includes('type:')) {
        // This might be a nested object
        nestedFields = [];
        const nestedContent = nestedMatch[1];
        const nestedFieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*(\w+)/g;
        let nestedFieldMatch;
        
        while ((nestedFieldMatch = nestedFieldRegex.exec(nestedContent)) !== null) {
          const nestedName = nestedFieldMatch[1];
          const nestedTypeStr = nestedFieldMatch[2];
          
          let nestedType: SchemaField['type'] = 'Unknown';
          if (nestedTypeStr === 'String') nestedType = 'String';
          else if (nestedTypeStr === 'Number') nestedType = 'Number';
          else if (nestedTypeStr === 'Boolean') nestedType = 'Boolean';
          else if (nestedTypeStr === 'Date') nestedType = 'Date';
          else if (nestedTypeStr === 'Array') nestedType = 'Array';
          else if (nestedTypeStr === 'Object') nestedType = 'Object';
          
          nestedFields.push({ name: nestedName, type: nestedType });
        }
        
        if (nestedFields.length > 0) {
          type = 'Object';
        }
      }
      
      fields.push({ name, type, enum: enumValues, nestedFields });
    }
    
    // Match ObjectId fields with refs
    const objectIdRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*mongoose\.Schema\.Types\.ObjectId\s*,\s*ref\s*:\s*['"](\w+)['"]/g;
    while ((match = objectIdRegex.exec(schemaContent)) !== null) {
      const name = match[1];
      const refModel = match[2];
      
      // Add the field with ObjectId type and reference
      fields.push({ 
        name, 
        type: 'ObjectId' as const, 
        ref: refModel 
      });
    }
    
    // Also look for nested objects directly
    const nestedObjectRegex = /(\w+)\s*:\s*\{([^{]*?)\}/g;
    while ((match = nestedObjectRegex.exec(schemaContent)) !== null) {
      const name = match[1];
      const content = match[2];
      
      // Skip if this is already processed or has a type property
      if (fields.some(f => f.name === name) || content.includes('type:')) {
        continue;
      }
      
      // This is likely a nested object without type
      const nestedFields: SchemaField[] = [];
      const nestedPropsRegex = /(\w+)\s*:/g;
      let nestedPropMatch;
      
      while ((nestedPropMatch = nestedPropsRegex.exec(content)) !== null) {
        nestedFields.push({
          name: nestedPropMatch[1],
          type: 'Unknown'
        });
      }
      
      if (nestedFields.length > 0) {
        fields.push({
          name,
          type: 'Object',
          nestedFields
        });
      }
    }
  }
  
  return fields;
}


function extractFieldsFromTypeScriptModel(code: string): SchemaField[] {
  const fields: SchemaField[] = [];
  
  try {
    // Look for Schema definition
    const schemaRegex = /(?:const|let|var)\s+(\w+Schema)\s*=\s*new\s+(?:Schema|mongoose\.Schema)\s*\(\s*\{([^}]*)\}/gs;
    const schemaMatch = schemaRegex.exec(code);
    
    if (schemaMatch && schemaMatch[2]) {
      const schemaContent = schemaMatch[2];
      
      // Match field definitions
      const fieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*([\w\.]+)/g;
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(schemaContent)) !== null) {
        const name = fieldMatch[1];
        const typeStr = fieldMatch[2];
        
        let type: SchemaField['type'] = 'Unknown';
        if (typeStr.includes('String')) type = 'String';
        else if (typeStr.includes('Number')) type = 'Number';
        else if (typeStr.includes('Boolean')) type = 'Boolean';
        else if (typeStr.includes('Date')) type = 'Date';
        else if (typeStr.includes('Array')) type = 'Array';
        else if (typeStr.includes('Object')) type = 'Object';
        else if (typeStr.includes('ObjectId') || typeStr.includes('Schema.Types.ObjectId')) type = 'ObjectId';
        
        // Check for enum values
        const enumRegex = new RegExp(`${name}\\s*:\\s*\\{[^}]*enum\\s*:\\s*([^,}]+)`, 'g');
        const enumMatch = enumRegex.exec(schemaContent);
        let enumValues: string[] | undefined;
        
        if (enumMatch && enumMatch[1]) {
          // Handle different enum formats
          const enumText = enumMatch[1].trim();
          
          if (enumText.startsWith('[') && enumText.endsWith(']')) {
            // Direct array of values
            enumValues = enumText.slice(1, -1).split(',')
              .map(val => val.trim().replace(/['"]/g, ''));
          } else if (enumText.includes('Object.values')) {
            // Object.values(SomeEnum)
            // We can't resolve the enum values directly, but we can note that it uses an enum
            enumValues = ['ENUM_VALUE_PLACEHOLDER'];
          }
        }
        
        fields.push({ name, type, enum: enumValues });
      }
      
      // Match ObjectId fields with refs
      const objectIdRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*(?:mongoose\.Schema\.Types\.ObjectId|Schema\.Types\.ObjectId)\s*,\s*ref\s*:\s*['"](\w+)['"]/g;
      let refMatch;
      
      while ((refMatch = objectIdRegex.exec(schemaContent)) !== null) {
        const name = refMatch[1];
        const refModel = refMatch[2];
        
        // Only add if not already added
        if (!fields.some(f => f.name === name)) {
          fields.push({ 
            name, 
            type: 'ObjectId', 
            ref: refModel 
          });
        }
      }
    }
  } catch (error) {
    console.error('Error extracting fields from TypeScript model:', error);
  }
  
  return fields;
}
