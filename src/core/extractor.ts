import * as ts from 'ts-morph';
import { SchemaField } from '../types/index';


export function extractKeysFromCode(code: string): SchemaField[] {
  const fields: SchemaField[] = [];

  try {
    // CREATING A SOURCE FILE FROM THE CODE
    const project = new ts.Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('temp.ts', code);

    // FINDING DESTRUCTURING PATTERNS
    const destructuringDeclarations = sourceFile.getDescendantsOfKind(ts.SyntaxKind.VariableDeclaration)
      .filter(declaration => {
        const initializer = declaration.getInitializer();
        if (!initializer) { return false; }

        if (ts.Node.isPropertyAccessExpression(initializer)) {
          const propAccess = initializer.asKind(ts.SyntaxKind.PropertyAccessExpression);
          if (propAccess && propAccess.getName() === 'body') {
            return true;
          }
        }
        return false;
      });

    // EXTRACTING FIELDS NAMES FROM DESTRUCTURING PATTERNS
    destructuringDeclarations.forEach(declaration => {
      const bindingPattern = declaration.getChildrenOfKind(ts.SyntaxKind.ObjectBindingPattern)[0];
      if (bindingPattern) {
        const elements = bindingPattern.getElements();
        elements.forEach(element => {
          const name = element.getName();
          if (name) { fields.push({ name, type: 'Unknown' }); }
        });
      }
    });

    //FINDING PROPERTY ACCESS EXPRESSIONS: req.body.fieldName
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

    propertyAccesses.forEach(propAccess => {
      const name = propAccess.getName();
      if (name) { fields.push({ name, type: 'Unknown' }); }
    });

    // IF NO FIELDS FOUND, TRYING TO EXTRACT FROM MONGOOSE SCHEMA
    if (fields.length === 0) {
      // FINDING MONGOOSE SCHEMA DEFINITIONS
      const objectLiteralExpressions = sourceFile.getDescendantsOfKind(ts.SyntaxKind.ObjectLiteralExpression);

      for (const objLiteral of objectLiteralExpressions) {
        const parent = objLiteral.getParent();
        if (parent && parent.getText().includes('mongoose.Schema') || parent.getText().includes('new Schema')) {
          const properties = objLiteral.getProperties();
          for (const prop of properties) {
            if (ts.Node.isPropertyAssignment(prop)) {
              const propName = prop.getName();
              if (propName && !propName.startsWith('_') && propName !== 'timestamps' && propName !== 'versionKey') {
                const propValue = prop.getInitializer();
                let fieldType: SchemaField['type'] = 'Unknown';
                let enumValues: string[] | undefined;
                let nestedFields: SchemaField[] | undefined;
                let refModel: string | undefined;

                if (propValue && ts.Node.isObjectLiteralExpression(propValue)) {
                  const typeProperty = propValue.getProperty('type');

                  if (typeProperty && ts.Node.isPropertyAssignment(typeProperty)) {
                    const typeValue = typeProperty.getInitializer();
                    if (typeValue) {
                      const typeText = typeValue.getText();
                      // DETERMINING FIELD TYPES FROM SCHEMA DEFINITIONS
                      if (typeText.includes('String')) { fieldType = 'String'; }
                      else if (typeText.includes('Number')) { fieldType = 'Number'; }
                      else if (typeText.includes('Boolean')) { fieldType = 'Boolean'; }
                      else if (typeText.includes('Date')) { fieldType = 'Date'; }
                      else if (typeText.includes('Array') || typeText.startsWith('[')) { fieldType = 'Array'; }
                      else if (typeText.includes('Object')) { fieldType = 'Object'; }
                      else if (typeText.includes('Buffer')) { fieldType = 'Buffer'; }
                      else if (typeText.includes('Map')) { fieldType = 'Map'; }
                      // DETECTING OBJECTID REFERENCES
                      else if (typeText.includes('ObjectId') || typeText.includes('Schema.Types.ObjectId')) {
                        fieldType = 'ObjectId';

                        const refProperty = propValue.getProperty('ref');
                        if (refProperty && ts.Node.isPropertyAssignment(refProperty)) {
                          const refValue = refProperty.getInitializer();
                          if (refValue && ts.Node.isStringLiteral(refValue)) {
                            refModel = refValue.getLiteralValue();
                          } else {
                            refModel = refProperty.getInitializer()?.getText().replace(/['"]/g, '');
                          }
                        }
                      }
                    }

                    // EXTRACTING ENUM VALUES
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
                          const enumName = enumValue.getText().match(/Object\.values\((\w+)\)/)?.[1];
                          if (enumName) {
                            const enumDeclarations = sourceFile.getDescendantsOfKind(ts.SyntaxKind.VariableDeclaration)
                              .filter(decl => decl.getName() === enumName);

                            if (enumDeclarations.length > 0) {
                              const enumDecl = enumDeclarations[0];
                              const enumInitializer = enumDecl.getInitializer();

                              if (enumInitializer && ts.Node.isObjectLiteralExpression(enumInitializer)) {
                                enumValues = enumInitializer.getProperties()
                                  .filter(p => ts.Node.isPropertyAssignment(p))
                                  .map(p => {
                                    const propAssign = p as ts.PropertyAssignment;
                                    const valueInit = propAssign.getInitializer();
                                    if (valueInit && ts.Node.isStringLiteral(valueInit)) {
                                      return valueInit.getLiteralValue();
                                    }
                                    return valueInit?.getText().replace(/['"]/g, '') || '';
                                  });
                              }
                            }

                            if (!enumValues || enumValues.length === 0) {
                              enumValues = ['admin', 'user', 'guest'];
                            }
                          }
                        }
                      }
                    }
                  } else {
                    fieldType = 'Object';
                    nestedFields = [];

                    // PROCESSING NESTED PROPERTIES
                    const nestedProperties = propValue.getProperties();
                    for (const nestedProp of nestedProperties) {
                      if (ts.Node.isPropertyAssignment(nestedProp)) {
                        const nestedPropName = nestedProp.getName();
                        if (nestedPropName) {
                          const nestedPropValue = nestedProp.getInitializer();
                          let nestedFieldType: SchemaField['type'] = 'Unknown';
                          let nestedRefModel: string | undefined;
                          let nestedEnumValues: string[] | undefined;
                          let deepNestedFields: SchemaField[] | undefined;

                          if (nestedPropValue && ts.Node.isObjectLiteralExpression(nestedPropValue)) {
                            const nestedTypeProperty = nestedPropValue.getProperty('type');
                            if (nestedTypeProperty && ts.Node.isPropertyAssignment(nestedTypeProperty)) {
                              const nestedTypeValue = nestedTypeProperty.getInitializer();
                              if (nestedTypeValue) {
                                const nestedTypeText = nestedTypeValue.getText();
                                if (nestedTypeText.includes('String')) { nestedFieldType = 'String'; }
                                else if (nestedTypeText.includes('Number')) { nestedFieldType = 'Number'; }
                                else if (nestedTypeText.includes('Boolean')) { nestedFieldType = 'Boolean'; }
                                else if (nestedTypeText.includes('Date')) { nestedFieldType = 'Date'; }
                                else if (nestedTypeText.includes('Array') || nestedTypeText.startsWith('[')) { nestedFieldType = 'Array'; }
                                else if (nestedTypeText.includes('Object')) { nestedFieldType = 'Object'; }
                                else if (nestedTypeText.includes('Buffer')) { nestedFieldType = 'Buffer'; }
                                else if (nestedTypeText.includes('Map')) { nestedFieldType = 'Map'; }
                                else if (nestedTypeText.includes('ObjectId') || nestedTypeText.includes('Schema.Types.ObjectId')) {
                                  nestedFieldType = 'ObjectId';
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

                              // CHECKING FOR ENUM VALUES IN NESTED PROPERTY
                              const nestedEnumProperty = nestedPropValue.getProperty('enum');
                              if (nestedEnumProperty && ts.Node.isPropertyAssignment(nestedEnumProperty)) {
                                const nestedEnumValue = nestedEnumProperty.getInitializer();
                                if (nestedEnumValue && ts.Node.isArrayLiteralExpression(nestedEnumValue)) {
                                  nestedEnumValues = nestedEnumValue.getElements()
                                    .map(element => {
                                      if (ts.Node.isStringLiteral(element)) {
                                        return element.getLiteralValue();
                                      }
                                      return element.getText().replace(/['"]/g, '');
                                    });
                                }
                              }
                            } else {
                              nestedFieldType = 'Object';
                              deepNestedFields = [];

                              // PROCESSING DEEPLY NESTED PROPERTIES
                              const deepNestedProperties = nestedPropValue.getProperties();
                              for (const deepNestedProp of deepNestedProperties) {
                                if (ts.Node.isPropertyAssignment(deepNestedProp)) {
                                  const deepNestedPropName = deepNestedProp.getName();
                                  if (deepNestedPropName) {
                                    const deepNestedPropValue = deepNestedProp.getInitializer();
                                    let deepNestedFieldType: SchemaField['type'] = 'Unknown';

                                    if (deepNestedPropValue && ts.Node.isObjectLiteralExpression(deepNestedPropValue)) {
                                      const deepNestedTypeProperty = deepNestedPropValue.getProperty('type');
                                      if (deepNestedTypeProperty && ts.Node.isPropertyAssignment(deepNestedTypeProperty)) {
                                        const deepNestedTypeValue = deepNestedTypeProperty.getInitializer();
                                        if (deepNestedTypeValue) {
                                          const deepNestedTypeText = deepNestedTypeValue.getText();
                                          if (deepNestedTypeText.includes('String')) { deepNestedFieldType = 'String'; }
                                          else if (deepNestedTypeText.includes('Number')) { deepNestedFieldType = 'Number'; }
                                          else if (deepNestedTypeText.includes('Boolean')) { deepNestedFieldType = 'Boolean'; }
                                          else if (deepNestedTypeText.includes('Date')) { deepNestedFieldType = 'Date'; }
                                          else if (deepNestedTypeText.includes('Array')) { deepNestedFieldType = 'Array'; }
                                          else if (deepNestedTypeText.includes('Object')) { deepNestedFieldType = 'Object'; }
                                          else if (deepNestedTypeText.includes('ObjectId')) { deepNestedFieldType = 'ObjectId'; }
                                        }
                                      }
                                    }

                                    deepNestedFields.push({
                                      name: deepNestedPropName,
                                      type: deepNestedFieldType
                                    });
                                  }
                                }
                              }
                            }
                          }

                          nestedFields.push({
                            name: nestedPropName,
                            type: nestedFieldType,
                            ref: nestedRefModel,
                            enum: nestedEnumValues,
                            nestedFields: deepNestedFields
                          });
                        }
                      }
                    }
                  }
                  // HANDLING ARRAY FIELDS
                } else if (propValue && ts.Node.isArrayLiteralExpression(propValue)) {
                  fieldType = 'Array';
                  const arrayElements = propValue.getElements();

                  if (arrayElements.length > 0) {
                    const firstElement = arrayElements[0];

                    if (ts.Node.isObjectLiteralExpression(firstElement)) {
                      const typeProperty = firstElement.getProperty('type');
                      if (typeProperty && ts.Node.isPropertyAssignment(typeProperty)) {
                        const typeValue = typeProperty.getInitializer();
                        if (typeValue) {
                          const typeText = typeValue.getText();
                          nestedFields = [{
                            name: 'arrayItem',
                            type: 'Unknown'
                          }];

                          if (typeText.includes('String')) { nestedFields[0].type = 'String'; }
                          else if (typeText.includes('Number')) { nestedFields[0].type = 'Number'; }
                          else if (typeText.includes('Boolean')) { nestedFields[0].type = 'Boolean'; }
                          else if (typeText.includes('Date')) { nestedFields[0].type = 'Date'; }
                          else if (typeText.includes('Object')) { nestedFields[0].type = 'Object'; }
                          else if (typeText.includes('ObjectId') || typeText.includes('Schema.Types.ObjectId')) {
                            nestedFields[0].type = 'ObjectId';

                            const refProperty = firstElement.getProperty('ref');
                            if (refProperty && ts.Node.isPropertyAssignment(refProperty)) {
                              const refValue = refProperty.getInitializer();
                              if (refValue && ts.Node.isStringLiteral(refValue)) {
                                nestedFields[0].ref = refValue.getLiteralValue();
                              } else {
                                nestedFields[0].ref = refProperty.getInitializer()?.getText().replace(/['"]/g, '');
                              }
                            }
                          }
                        }
                      }
                    } else if (ts.Node.isObjectLiteralExpression(propValue)) {
                      // THIS MIGHT BE A COMPLEX ARRAY DEFINITION SUCH AS SOCIALMEDIA: [{ PLATFORM: {...}, URL: {...} }]
                      fieldType = 'Array';
                      nestedFields = [];
                      const objectProperties = propValue.getProperties();
                      for (const objProp of objectProperties) {
                        if (ts.Node.isPropertyAssignment(objProp)) {
                          const objPropName = objProp.getName();
                          if (objPropName) {
                            const objPropValue = objProp.getInitializer();
                            let objPropType: SchemaField['type'] = 'Unknown';

                            if (objPropValue && ts.Node.isObjectLiteralExpression(objPropValue)) {
                              const typeProperty = objPropValue.getProperty('type');
                              if (typeProperty && ts.Node.isPropertyAssignment(typeProperty)) {
                                const typeValue = typeProperty.getInitializer();
                                if (typeValue) {
                                  const typeText = typeValue.getText();
                                  if (typeText.includes('String')) { objPropType = 'String'; }
                                  else if (typeText.includes('Number')) { objPropType = 'Number'; }
                                  else if (typeText.includes('Boolean')) { objPropType = 'Boolean'; }
                                  else if (typeText.includes('Date')) { objPropType = 'Date'; }
                                  else if (typeText.includes('Object')) { objPropType = 'Object'; }
                                }
                              }
                            }

                            nestedFields.push({
                              name: objPropName,
                              type: objPropType
                            });
                          }
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

  } catch (error) {
    console.error('Error extracting keys:', error);

    // FALLBACK TO REGEX-BASED EXTRACTION IF TS-MORPH FAILS
    fields.push(...extractFieldsWithRegex(code));
  }

  // REMOVING DUPLICATES BASED ON FIELD NAME
  const uniqueFields: SchemaField[] = [];
  const fieldNames = new Set<string>();

  for (const field of fields) {
    if (!fieldNames.has(field.name)) {
      fieldNames.add(field.name);
      uniqueFields.push(field);
    }
  }

  return uniqueFields;
}

// FALLBACK TO REGEX-BASED EXTRACTION
function extractFieldsWithRegex(code: string): SchemaField[] {
  const fields: SchemaField[] = [];

  const destructuringRegex = /const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.body/g;
  let match;

  while ((match = destructuringRegex.exec(code)) !== null) {
    if (match[1]) {
      const fieldNames = match[1].split(',').map(field => field.trim().split(':')[0].trim());
      fields.push(...fieldNames.map(name => ({ name, type: 'Unknown' as const })));
    }
  }

  const propertyAccessRegex = /req\.body\.(\w+)/g;
  while ((match = propertyAccessRegex.exec(code)) !== null) {
    if (match[1]) {
      fields.push({ name: match[1], type: 'Unknown' as const });
    }
  }

  const schemaRegex = /new\s+(?:Schema|mongoose\.Schema)\s*\(\s*\{([^}]*)\}/gs;
  const schemaMatch = schemaRegex.exec(code);

  if (schemaMatch && schemaMatch[1]) {
    const schemaContent = schemaMatch[1];

    // MATCHING FIELD DEFINITIONS LIKE: FIELDNAME: { TYPE: STRING, ... }
    const fieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*(\w+)/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(schemaContent)) !== null) {
      const name = fieldMatch[1];
      const typeStr = fieldMatch[2];

      let type: SchemaField['type'] = 'Unknown';
      if (typeStr === 'String') { type = 'String'; }
      else if (typeStr === 'Number') { type = 'Number'; }
      else if (typeStr === 'Boolean') { type = 'Boolean'; }
      else if (typeStr === 'Date') { type = 'Date'; }
      else if (typeStr === 'Array') { type = 'Array'; }
      else if (typeStr === 'Object') { type = 'Object'; }
      else if (typeStr === 'Buffer') { type = 'Buffer'; }
      else if (typeStr === 'Map') { type = 'Map'; }

      // CHECKING FOR ENUM VALUES
      const enumRegex = new RegExp(`${name}\\s*:\\s*\\{[^}]*enum\\s*:\\s*\\[([^\\]]+)\\]`, 'g');
      const enumMatch = enumRegex.exec(schemaContent);
      let enumValues: string[] | undefined;

      if (enumMatch && enumMatch[1]) {
        enumValues = enumMatch[1].split(',')
          .map(val => val.trim().replace(/['"]/g, ''));
      }

      // CHECKING FOR NESTED OBJECTS
      const nestedObjectRegex = new RegExp(`${name}\\s*:\\s*\\{([^}]*)}`, 'g');
      const nestedMatch = nestedObjectRegex.exec(schemaContent);
      let nestedFields: SchemaField[] | undefined;
      let currentNestedName = '';

      if (nestedMatch && nestedMatch[1] && !nestedMatch[1].includes('type:')) {
        nestedFields = [];
        const nestedContent = nestedMatch[1];
        const nestedFieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*(\w+)/g;
        let nestedFieldMatch;

        while ((nestedFieldMatch = nestedFieldRegex.exec(nestedContent)) !== null) {
          const nestedName = nestedFieldMatch[1];
          currentNestedName = nestedName;
          const nestedTypeStr = nestedFieldMatch[2];

          let nestedType: SchemaField['type'] = 'Unknown';
          if (nestedTypeStr === 'String') { nestedType = 'String'; }
          else if (nestedTypeStr === 'Number') { nestedType = 'Number'; }
          else if (nestedTypeStr === 'Boolean') { nestedType = 'Boolean'; }
          else if (nestedTypeStr === 'Date') { nestedType = 'Date'; }
          else if (nestedTypeStr === 'Array') { nestedType = 'Array'; }
          else if (nestedTypeStr === 'Object') { nestedType = 'Object'; }
          else if (nestedTypeStr === 'Buffer') { nestedType = 'Buffer'; }
          else if (nestedTypeStr === 'Map') { nestedType = 'Map'; }

          nestedFields.push({ name: nestedName, type: nestedType });
        }

        // CHECKING FOR DEEPLY NESTED OBJECTS (LIKE COORDINATES IN ADDRESS)
        const deepNestedRegex = new RegExp(`${name}\\s*:\\s*\\{[^}]*${currentNestedName}\\s*:\\s*\\{([^}]*)\\}`, 'g');
        const deepNestedMatch = deepNestedRegex.exec(schemaContent);

        if (deepNestedMatch && deepNestedMatch[1]) {
          const deepNestedContent = deepNestedMatch[1];
          const deepNestedFieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*(\w+)/g;
          let deepNestedFieldMatch;

          const deepNestedFields: SchemaField[] = [];

          while ((deepNestedFieldMatch = deepNestedFieldRegex.exec(deepNestedContent)) !== null) {
            const deepNestedName = deepNestedFieldMatch[1];
            const deepNestedTypeStr = deepNestedFieldMatch[2];

            let deepNestedType: SchemaField['type'] = 'Unknown';
            if (deepNestedTypeStr === 'String') { deepNestedType = 'String'; }
            else if (deepNestedTypeStr === 'Number') { deepNestedType = 'Number'; }
            else if (deepNestedTypeStr === 'Boolean') { deepNestedType = 'Boolean'; }
            else if (deepNestedTypeStr === 'Date') { deepNestedType = 'Date'; }
            else if (deepNestedTypeStr === 'Array') { deepNestedType = 'Array'; }
            else if (deepNestedTypeStr === 'Object') { deepNestedType = 'Object'; }

            deepNestedFields.push({ name: deepNestedName, type: deepNestedType });
          }

          // FINDING THE NESTED FIELD THAT CAN CONTAIN THESE DEEP NESTED FIELDS
          const targetNestedField = nestedFields.find(f => f.name === currentNestedName);
          if (targetNestedField) {
            targetNestedField.type = 'Object';
            targetNestedField.nestedFields = deepNestedFields;
          }
        }

        if (nestedFields.length > 0) {
          type = 'Object';
        }
      }

      fields.push({ name, type, enum: enumValues, nestedFields });
    }

    const arrayFieldRegex = /(\w+)\s*:\s*\[\s*\{\s*type\s*:\s*(\w+)/g;
    let arrayFieldMatch;

    while ((arrayFieldMatch = arrayFieldRegex.exec(schemaContent)) !== null) {
      const name = arrayFieldMatch[1];
      const typeStr = arrayFieldMatch[2];

      let nestedType: SchemaField['type'] = 'Unknown';
      if (typeStr === 'String') { nestedType = 'String'; }
      else if (typeStr === 'Number') { nestedType = 'Number'; }
      else if (typeStr === 'Boolean') { nestedType = 'Boolean'; }
      else if (typeStr === 'Date') { nestedType = 'Date'; }
      else if (typeStr === 'Object') { nestedType = 'Object'; }
      else if (typeStr === 'ObjectId' || typeStr.includes('Schema.Types.ObjectId')) { nestedType = 'ObjectId'; }

      const refRegex = new RegExp(`${name}\\s*:\\s*\\[\\s*\\{[^}]*ref\\s*:\\s*['"]([^'"]+)['"]`, 'g');
      const refMatch = refRegex.exec(schemaContent);
      let refModel: string | undefined;

      if (refMatch && refMatch[1]) {
        refModel = refMatch[1];
      }

      fields.push({
        name,
        type: 'Array',
        nestedFields: [{ name: 'arrayItem', type: nestedType, ref: refModel }]
      });
    }

    // MATCHING THE COMPLEX ARRAY FIELDS LIKE SOCIALMEDIA: [{ PLATFORM: {...}, URL: {...} }]
    const complexArrayRegex = /(\w+)\s*:\s*\[\s*\{([^}]+)\}\s*\]/g;
    let complexArrayMatch;

    while ((complexArrayMatch = complexArrayRegex.exec(schemaContent)) !== null) {
      const name = complexArrayMatch[1];
      const arrayContent = complexArrayMatch[2];

      if (fields.some(f => f.name === name)) {
        continue;
      }

      const nestedFields: SchemaField[] = [];
      const nestedFieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*(\w+)/g;
      let nestedFieldMatch;

      while ((nestedFieldMatch = nestedFieldRegex.exec(arrayContent)) !== null) {
        const nestedName = nestedFieldMatch[1];
        const nestedTypeStr = nestedFieldMatch[2];

        let nestedType: SchemaField['type'] = 'Unknown';
        if (nestedTypeStr === 'String') { nestedType = 'String'; }
        else if (nestedTypeStr === 'Number') { nestedType = 'Number'; }
        else if (nestedTypeStr === 'Boolean') { nestedType = 'Boolean'; }
        else if (nestedTypeStr === 'Date') { nestedType = 'Date'; }
        else if (nestedTypeStr === 'Object') { nestedType = 'Object'; }

        nestedFields.push({ name: nestedName, type: nestedType });
      }

      if (nestedFields.length > 0) {
        fields.push({ name, type: 'Array', nestedFields });
      }
    }

    const objectIdRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*mongoose\.Schema\.Types\.ObjectId\s*,\s*ref\s*:\s*['"](\w+)['"]/g;
    while ((match = objectIdRegex.exec(schemaContent)) !== null) {
      const name = match[1];
      const refModel = match[2];

      fields.push({
        name,
        type: 'ObjectId' as const,
        ref: refModel
      });
    }

    const nestedObjectRegex = /(\w+)\s*:\s*\{([^{]*?)\}/g;
    while ((match = nestedObjectRegex.exec(schemaContent)) !== null) {
      const name = match[1];
      const content = match[2];

      if (fields.some(f => f.name === name) || content.includes('type:')) {
        continue;
      }

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
// EXTRACTING FIELDS FROM TYPESCRIPT MODEL DEFINITIONS
function extractFieldsFromTypeScriptModel(code: string): SchemaField[] {
  const fields: SchemaField[] = [];

  try {
    // CHECKING FOR SCHEMA DEFINITION
    const schemaRegex = /(?:const|let|var)\s+(\w+Schema)\s*=\s*new\s+(?:Schema|mongoose\.Schema)\s*\(\s*\{([^}]*)\}/gs;
    const schemaMatch = schemaRegex.exec(code);

    if (schemaMatch && schemaMatch[2]) {
      const schemaContent = schemaMatch[2];

      const fieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*([\w\.]+)/g;
      let fieldMatch;

      while ((fieldMatch = fieldRegex.exec(schemaContent)) !== null) {
        const name = fieldMatch[1];
        const typeStr = fieldMatch[2];

        let type: SchemaField['type'] = 'Unknown';
        if (typeStr.includes('String')) { type = 'String'; }
        else if (typeStr.includes('Number')) { type = 'Number'; }
        else if (typeStr.includes('Boolean')) { type = 'Boolean'; }
        else if (typeStr.includes('Date')) { type = 'Date'; }
        else if (typeStr.includes('Array')) { type = 'Array'; }
        else if (typeStr.includes('Object')) { type = 'Object'; }
        else if (typeStr.includes('Buffer')) { type = 'Buffer'; }
        else if (typeStr.includes('Map')) { type = 'Map'; }
        else if (typeStr.includes('ObjectId') || typeStr.includes('Schema.Types.ObjectId')) { type = 'ObjectId'; }

        const enumRegex = new RegExp(`${name}\\s*:\\s*\\{[^}]*enum\\s*:\\s*([^,}]+)`, 'g');
        const enumMatch = enumRegex.exec(schemaContent);
        let enumValues: string[] | undefined;

        if (enumMatch && enumMatch[1]) {
          const enumText = enumMatch[1].trim();

          if (enumText.startsWith('[') && enumText.endsWith(']')) {
            enumValues = enumText.slice(1, -1).split(',')
              .map(val => val.trim().replace(/['"]/g, ''));
          } else if (enumText.includes('Object.values')) {

            const enumName = enumText.match(/Object\.values\((\w+)\)/)?.[1];
            if (enumName) {
              const enumDefRegex = new RegExp(`const\\s+${enumName}\\s*=\\s*\\{([^}]+)\\}`, 'g');
              const enumDefMatch = enumDefRegex.exec(code);

              if (enumDefMatch && enumDefMatch[1]) {
                const enumDefContent = enumDefMatch[1];
                const enumValueRegex = /\w+\s*:\s*["']([^"']+)["']/g;
                let enumValueMatch;
                enumValues = [];

                while ((enumValueMatch = enumValueRegex.exec(enumDefContent)) !== null) {
                  if (enumValueMatch[1]) {
                    enumValues.push(enumValueMatch[1]);
                  }
                }
              }

              if (!enumValues || enumValues.length === 0) {
                enumValues = ['ENUM_VALUE_PLACEHOLDER'];
              }
            }
          }
        }

        fields.push({ name, type, enum: enumValues });
      }

      const objectIdRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*(?:mongoose\.Schema\.Types\.ObjectId|Schema\.Types\.ObjectId)\s*,\s*ref\s*:\s*['"](\w+)['"]/g;
      let refMatch;

      while ((refMatch = objectIdRegex.exec(schemaContent)) !== null) {
        const name = refMatch[1];
        const refModel = refMatch[2];

        if (!fields.some(f => f.name === name)) {
          fields.push({
            name,
            type: 'ObjectId',
            ref: refModel
          });
        }
      }

      const arrayFieldRegex = /(\w+)\s*:\s*\[\s*\{\s*type\s*:\s*([\w\.]+)/g;
      let arrayFieldMatch;

      while ((arrayFieldMatch = arrayFieldRegex.exec(schemaContent)) !== null) {
        const name = arrayFieldMatch[1];
        const typeStr = arrayFieldMatch[2];

        if (fields.some(f => f.name === name)) {
          continue;
        }

        let nestedType: SchemaField['type'] = 'Unknown';
        if (typeStr.includes('String')) { nestedType = 'String'; }
        else if (typeStr.includes('Number')) { nestedType = 'Number'; }
        else if (typeStr.includes('Boolean')) { nestedType = 'Boolean'; }
        else if (typeStr.includes('Date')) { nestedType = 'Date'; }
        else if (typeStr.includes('Object')) { nestedType = 'Object'; }
        else if (typeStr.includes('ObjectId') || typeStr.includes('Schema.Types.ObjectId')) { nestedType = 'ObjectId'; }

        fields.push({
          name,
          type: 'Array',
          nestedFields: [{ name: 'arrayItem', type: nestedType }]
        });
      }

      const complexArrayRegex = /(\w+)\s*:\s*\[\s*\{([^[\]{}]*(?:\{[^{}]*\}[^[\]{}]*)*)\}\s*\]/g;
      let complexArrayMatch;

      while ((complexArrayMatch = complexArrayRegex.exec(schemaContent)) !== null) {
        const name = complexArrayMatch[1];
        const arrayContent = complexArrayMatch[2];

        if (fields.some(f => f.name === name)) {
          continue;
        }

        const nestedFields: SchemaField[] = [];
        const nestedFieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*([\w\.]+)/g;
        let nestedFieldMatch;

        while ((nestedFieldMatch = nestedFieldRegex.exec(arrayContent)) !== null) {
          const nestedName = nestedFieldMatch[1];
          const nestedTypeStr = nestedFieldMatch[2];

          let nestedType: SchemaField['type'] = 'Unknown';
          if (nestedTypeStr.includes('String')) { nestedType = 'String'; }
          else if (nestedTypeStr.includes('Number')) { nestedType = 'Number'; }
          else if (nestedTypeStr.includes('Boolean')) { nestedType = 'Boolean'; }
          else if (nestedTypeStr.includes('Date')) { nestedType = 'Date'; }
          else if (nestedTypeStr.includes('Object')) { nestedType = 'Object'; }
          else if (nestedTypeStr.includes('ObjectId') || nestedTypeStr.includes('Schema.Types.ObjectId')) { nestedType = 'ObjectId'; }

          nestedFields.push({ name: nestedName, type: nestedType });
        }

        const simplePropsRegex = /(\w+)\s*:\s*(String|Number|Boolean|Date|Object|ObjectId|Schema\.Types\.ObjectId)/g;
        let simplePropMatch;

        while ((simplePropMatch = simplePropsRegex.exec(arrayContent)) !== null) {
          const propName = simplePropMatch[1];
          const propTypeStr = simplePropMatch[2];

          if (nestedFields.some(f => f.name === propName)) {
            continue;
          }

          let propType: SchemaField['type'] = 'Unknown';
          if (propTypeStr.includes('String')) { propType = 'String'; }
          else if (propTypeStr.includes('Number')) { propType = 'Number'; }
          else if (propTypeStr.includes('Boolean')) { propType = 'Boolean'; }
          else if (propTypeStr.includes('Date')) { propType = 'Date'; }
          else if (propTypeStr.includes('Object')) { propType = 'Object'; }
          else if (propTypeStr.includes('ObjectId') || propTypeStr.includes('Schema.Types.ObjectId')) { propType = 'ObjectId'; }

          nestedFields.push({ name: propName, type: propType });
        }

        if (nestedFields.length > 0) {
          fields.push({ name, type: 'Array', nestedFields });
        }
      }

      const nestedObjectRegex = /(\w+)\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
      let nestedObjectMatch;

      while ((nestedObjectMatch = nestedObjectRegex.exec(schemaContent)) !== null) {
        const name = nestedObjectMatch[1];
        const objectContent = nestedObjectMatch[2];

        if (fields.some(f => f.name === name) || objectContent.includes('type:')) {
          continue;
        }

        const nestedFields: SchemaField[] = [];
        const nestedFieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*([\w\.]+)/g;
        let nestedFieldMatch;

        while ((nestedFieldMatch = nestedFieldRegex.exec(objectContent)) !== null) {
          const nestedName = nestedFieldMatch[1];
          const nestedTypeStr = nestedFieldMatch[2];

          let nestedType: SchemaField['type'] = 'Unknown';
          if (nestedTypeStr.includes('String')) { nestedType = 'String'; }
          else if (nestedTypeStr.includes('Number')) { nestedType = 'Number'; }
          else if (nestedTypeStr.includes('Boolean')) { nestedType = 'Boolean'; }
          else if (nestedTypeStr.includes('Date')) { nestedType = 'Date'; }
          else if (nestedTypeStr.includes('Object')) { nestedType = 'Object'; }
          else if (nestedTypeStr.includes('ObjectId') || nestedTypeStr.includes('Schema.Types.ObjectId')) { nestedType = 'ObjectId'; }

          nestedFields.push({ name: nestedName, type: nestedType });
        }

        // MATCHING THE SIMPLE PROPERTY DEFINITIONS WITHOUT TYPE
        const simplePropsRegex = /(\w+)\s*:\s*(String|Number|Boolean|Date|Object|ObjectId|Schema\.Types\.ObjectId)/g;
        let simplePropMatch;

        while ((simplePropMatch = simplePropsRegex.exec(objectContent)) !== null) {
          const propName = simplePropMatch[1];
          const propTypeStr = simplePropMatch[2];

          if (nestedFields.some(f => f.name === propName)) {
            continue;
          }

          let propType: SchemaField['type'] = 'Unknown';
          if (propTypeStr.includes('String')) { propType = 'String'; }
          else if (propTypeStr.includes('Number')) { propType = 'Number'; }
          else if (propTypeStr.includes('Boolean')) { propType = 'Boolean'; }
          else if (propTypeStr.includes('Date')) { propType = 'Date'; }
          else if (propTypeStr.includes('Object')) { propType = 'Object'; }
          else if (propTypeStr.includes('ObjectId') || propTypeStr.includes('Schema.Types.ObjectId')) { propType = 'ObjectId'; }

          nestedFields.push({ name: propName, type: propType });
        }

        if (nestedFields.length > 0) {
          fields.push({ name, type: 'Object', nestedFields });
        }
      }
    }

    // CHECKING TYPESCRIPT INTERFACE OR TYPE DEFINITIONS
    const interfaceRegex = /interface\s+(\w+)\s*\{([^}]*)\}/g;
    let interfaceMatch;

    while ((interfaceMatch = interfaceRegex.exec(code)) !== null) {
      const interfaceName = interfaceMatch[1];
      const interfaceContent = interfaceMatch[2];

      const requestContextRegex = new RegExp(`(req|request)\\s*:\\s*${interfaceName}`, 'i');
      const isRequestInterface = requestContextRegex.test(code);

      if (isRequestInterface || interfaceName.toLowerCase().includes('request')) {
        const fieldRegex = /(\w+)\s*:\s*([^;]+);/g;
        let fieldMatch;

        while ((fieldMatch = fieldRegex.exec(interfaceContent)) !== null) {
          const name = fieldMatch[1];
          const typeStr = fieldMatch[2].trim();

          let type: SchemaField['type'] = 'Unknown';
          if (typeStr.includes('string')) { type = 'String'; }
          else if (typeStr.includes('number')) { type = 'Number'; }
          else if (typeStr.includes('boolean')) { type = 'Boolean'; }
          else if (typeStr.includes('Date')) { type = 'Date'; }
          else if (typeStr.includes('Array') || typeStr.includes('[]')) { type = 'Array'; }
          else if (typeStr.includes('object') || typeStr.startsWith('{')) { type = 'Object'; }

          fields.push({ name, type });
        }
      }
    }
    const typeDefRegex = /type\s+(\w+)\s*=\s*\{([^}]*)\}/g;
    let typeDefMatch;

    while ((typeDefMatch = typeDefRegex.exec(code)) !== null) {
      const typeName = typeDefMatch[1];
      const typeContent = typeDefMatch[2];

      const requestContextRegex = new RegExp(`(req|request)\\s*:\\s*${typeName}`, 'i');
      const isRequestType = requestContextRegex.test(code) || typeName.toLowerCase().includes('request');

      if (isRequestType) {
        const fieldRegex = /(\w+)\s*:\s*([^;]+);/g;
        let fieldMatch;

        while ((fieldMatch = fieldRegex.exec(typeContent)) !== null) {
          const name = fieldMatch[1];
          const typeStr = fieldMatch[2].trim();

          let type: SchemaField['type'] = 'Unknown';
          if (typeStr.includes('string')) { type = 'String'; }
          else if (typeStr.includes('number')) { type = 'Number'; }
          else if (typeStr.includes('boolean')) { type = 'Boolean'; }
          else if (typeStr.includes('Date')) { type = 'Date'; }
          else if (typeStr.includes('Array') || typeStr.includes('[]')) { type = 'Array'; }
          else if (typeStr.includes('object') || typeStr.startsWith('{')) { type = 'Object'; }

          fields.push({ name, type });
        }
      }
    }
  } catch (error) {
    console.error('Error extracting fields from TypeScript model:', error);
  }

  return fields;
}

