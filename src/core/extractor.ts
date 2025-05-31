import * as ts from 'ts-morph';
import { SchemaField } from '../types/index';

export function extractKeysFromCode(code: string): SchemaField[] {
  const fields: SchemaField[] = [];

  try {
    // CREATING A SOURCE FILE FROM THE CODE
    const project = new ts.Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('temp.ts', code);

    // SCENARIO 1: DESTRUCTURING PATTERNS
    const destructuringDeclarations = sourceFile.getDescendantsOfKind(ts.SyntaxKind.VariableDeclaration)
      .filter(declaration => {
        const initializer = declaration.getInitializer();
        if (!initializer) { return false; }

        // CHECKING IF IT IS A PROPERTY ACCESS EXPRESSION (req.body)
        if (ts.Node.isPropertyAccessExpression(initializer)) {
          const propAccess = initializer.asKind(ts.SyntaxKind.PropertyAccessExpression);
          if (propAccess && propAccess.getName() === 'body') {
            return true;
          }
        }
        return false;
      });

    // EXTRACTING FIELD NAMES FROM DESTRUCTURING PATTERNS
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

    // SCENARIO 2: DIRECT PROPERTY ACCESS
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

    // SCENARIO 3: TYPE ASSERTIONS
    const asExpressions = sourceFile.getDescendantsOfKind(ts.SyntaxKind.AsExpression);

    for (const asExpr of asExpressions) {
      const expression = asExpr.getExpression();

      if (ts.Node.isPropertyAccessExpression(expression)) {
        const propAccess = expression.asKind(ts.SyntaxKind.PropertyAccessExpression);
        if (propAccess && propAccess.getName() === 'body') {
          const typeNode = asExpr.getTypeNode();
          if (typeNode) {
            const typeName = typeNode.getText();

            const interfaces = sourceFile.getInterfaces();
            for (const interfaceDecl of interfaces) {
              if (interfaceDecl.getName() === typeName) {
                const properties = interfaceDecl.getProperties();
                for (const prop of properties) {
                  const propName = prop.getName();
                  const typeNode = prop.getTypeNode();
                  let fieldType: SchemaField['type'] = 'Unknown';

                  if (typeNode) {
                    const typeText = typeNode.getText();
                    if (typeText.includes('string')) { fieldType = 'String'; }
                    else if (typeText.includes('number')) { fieldType = 'Number'; }
                    else if (typeText.includes('boolean')) { fieldType = 'Boolean'; }
                    else if (typeText.includes('Date')) { fieldType = 'Date'; }
                    else if (typeText.includes('[]') || typeText.includes('Array')) { fieldType = 'Array'; }
                    else if (typeText.includes('object')) { fieldType = 'Object'; }
                  }

                  fields.push({ name: propName, type: fieldType });
                }
              }
            }

            const typeAliases = sourceFile.getTypeAliases();
            for (const typeAlias of typeAliases) {
              if (typeAlias.getName() === typeName) {
                const aliasTypeNode = typeAlias.getTypeNode();

                // HANDLING TYPE LITERALS (OBJECTS WITH PROPERTIES)
                if (aliasTypeNode && ts.Node.isTypeLiteral(aliasTypeNode)) {
                  const members = aliasTypeNode.getMembers();

                  for (const member of members) {
                    if (ts.Node.isPropertySignature(member)) {
                      const propName = member.getName();
                      const memberTypeNode = member.getTypeNode();
                      let fieldType: SchemaField['type'] = 'Unknown';

                      if (memberTypeNode) {
                        const typeText = memberTypeNode.getText();
                        if (typeText.includes('string')) { fieldType = 'String'; }
                        else if (typeText.includes('number')) { fieldType = 'Number'; }
                        else if (typeText.includes('boolean')) { fieldType = 'Boolean'; }
                        else if (typeText.includes('Date')) { fieldType = 'Date'; }
                        else if (typeText.includes('[]') || typeText.includes('Array')) { fieldType = 'Array'; }
                        else if (typeText.includes('object')) { fieldType = 'Object'; }
                      }

                      fields.push({ name: propName, type: fieldType });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // SCENARIO 4: MONGOOSE SCHEMA: IF NO FIELDS FOUND YET, TRY TO EXTRACT FROM MONGOOSE SCHEMA

    if (fields.length === 0) {
      const objectLiteralExpressions = sourceFile.getDescendantsOfKind(ts.SyntaxKind.ObjectLiteralExpression);

      for (const objLiteral of objectLiteralExpressions) {
        const parent = objLiteral.getParent();

        const isMongooseSchema = parent && (
          parent.getText().includes('mongoose.Schema') ||
          parent.getText().includes('new Schema') ||
          (parent.getKind() === ts.SyntaxKind.NewExpression &&
            parent.getText().includes('Schema'))
        );

        if (isMongooseSchema) {
          console.log("Found Mongoose schema");

          // EXTRACT PROPERTY NAMES AND TYPES FROM THE SCHEMA
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

                // PROCESS PROPERTY VALUE
                if (propValue) {
                  if (ts.Node.isObjectLiteralExpression(propValue)) {
                    const typeProperty = propValue.getProperty('type');

                    if (typeProperty && ts.Node.isPropertyAssignment(typeProperty)) {
                      const typeValue = typeProperty.getInitializer();
                      if (typeValue) {
                        const typeText = typeValue.getText();

                        // DETERMINING FIELD TYPE
                        if (typeText.includes('String')) { fieldType = 'String'; }
                        else if (typeText.includes('Number')) { fieldType = 'Number'; }
                        else if (typeText.includes('Boolean')) { fieldType = 'Boolean'; }
                        else if (typeText.includes('Date')) { fieldType = 'Date'; }
                        else if (typeText.includes('Array') || typeText.startsWith('[')) { fieldType = 'Array'; }
                        else if (typeText.includes('Object')) { fieldType = 'Object'; }
                        else if (typeText.includes('Buffer')) { fieldType = 'String'; }
                        else if (typeText.includes('Map')) { fieldType = 'Object'; }
                        else if (typeText.includes('Mixed')) { fieldType = 'Object'; }
                        else if (typeText.includes('ObjectId') ||
                          typeText.includes('Schema.Types.ObjectId') ||
                          typeText.includes('mongoose.Schema.Types.ObjectId')) {
                          fieldType = 'ObjectId';

                          // EXTRACTING THE REFERENCED MODEL
                          const refProperty = propValue.getProperty('ref');
                          if (refProperty && ts.Node.isPropertyAssignment(refProperty)) {
                            const refValue = refProperty.getInitializer();
                            if (refValue) {
                              refModel = refValue.getText().replace(/['"]/g, '');
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
                              .map(element => element.getText().replace(/['"]/g, ''));
                          } else if (enumValue.getText().includes('Object.values')) {
                            const objectName = enumValue.getText().match(/Object\.values\((\w+)\)/)?.[1];
                            if (objectName) {
                              // TRYING TO FIND THE OBJECT DECLARATION
                              const variableDeclarations = sourceFile.getDescendantsOfKind(ts.SyntaxKind.VariableDeclaration);
                              for (const varDecl of variableDeclarations) {
                                if (varDecl.getName() === objectName) {
                                  const initializer = varDecl.getInitializer();
                                  if (initializer && ts.Node.isObjectLiteralExpression(initializer)) {
                                    // EXTRACTING VALUES FROM THE OBJECT
                                    enumValues = initializer.getProperties()
                                      .filter(p => ts.Node.isPropertyAssignment(p))
                                      .map(p => {
                                        const init = (p as ts.PropertyAssignment).getInitializer();
                                        return init ? init.getText().replace(/['"]/g, '') : '';
                                      })
                                      .filter(v => v !== '');
                                  }
                                }
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

                            if (nestedPropValue && ts.Node.isObjectLiteralExpression(nestedPropValue)) {
                              // EXTRACTING TYPE FROM NESTED PROPERTY
                              const nestedTypeProperty = nestedPropValue.getProperty('type');
                              if (nestedTypeProperty && ts.Node.isPropertyAssignment(nestedTypeProperty)) {
                                const nestedTypeValue = nestedTypeProperty.getInitializer();
                                if (nestedTypeValue) {
                                  const nestedTypeText = nestedTypeValue.getText();
                                  if (nestedTypeText.includes('String')) { nestedFieldType = 'String'; }
                                  else if (nestedTypeText.includes('Number')) { nestedFieldType = 'Number'; }
                                  else if (nestedTypeText.includes('Boolean')) { nestedFieldType = 'Boolean'; }
                                  else if (nestedTypeText.includes('Date')) { nestedFieldType = 'Date'; }
                                  else if (nestedTypeText.includes('Array')) { nestedFieldType = 'Array'; }
                                  else if (nestedTypeText.includes('Object')) { nestedFieldType = 'Object'; }
                                  else if (nestedTypeText.includes('ObjectId') ||
                                    nestedTypeText.includes('Schema.Types.ObjectId') ||
                                    nestedTypeText.includes('mongoose.Schema.Types.ObjectId')) {
                                    nestedFieldType = 'ObjectId';

                                    const nestedRefProperty = nestedPropValue.getProperty('ref');
                                    if (nestedRefProperty && ts.Node.isPropertyAssignment(nestedRefProperty)) {
                                      const nestedRefValue = nestedRefProperty.getInitializer();
                                      if (nestedRefValue) {
                                        nestedRefModel = nestedRefValue.getText().replace(/['"]/g, '');
                                      }
                                    }
                                  }
                                }
                              } else {
                                nestedFieldType = 'Object';
                                // RECURSIVELY PROCESSING DEEPER NESTING
                                const deepNestedFields: SchemaField[] = [];
                                const deepProperties = nestedPropValue.getProperties();

                                for (const deepProp of deepProperties) {
                                  if (ts.Node.isPropertyAssignment(deepProp)) {
                                    const deepPropName = deepProp.getName();
                                    if (deepPropName) {
                                      const deepPropValue = deepProp.getInitializer();
                                      let deepFieldType: SchemaField['type'] = 'Unknown';

                                      if (deepPropValue && ts.Node.isObjectLiteralExpression(deepPropValue)) {
                                        const deepTypeProperty = deepPropValue.getProperty('type');
                                        if (deepTypeProperty && ts.Node.isPropertyAssignment(deepTypeProperty)) {
                                          const deepTypeValue = deepTypeProperty.getInitializer();
                                          if (deepTypeValue) {
                                            const deepTypeText = deepTypeValue.getText();
                                            if (deepTypeText.includes('String')) { deepFieldType = 'String'; }
                                            else if (deepTypeText.includes('Number')) { deepFieldType = 'Number'; }
                                            else if (deepTypeText.includes('Boolean')) { deepFieldType = 'Boolean'; }
                                            else if (deepTypeText.includes('Date')) { deepFieldType = 'Date'; }
                                            else if (deepTypeText.includes('Array')) { deepFieldType = 'Array'; }
                                            else if (deepTypeText.includes('Object')) { deepFieldType = 'Object'; }
                                            else if (deepTypeText.includes('ObjectId') ||
                                              deepTypeText.includes('Schema.Types.ObjectId')) {
                                              deepFieldType = 'ObjectId';
                                            }
                                          }
                                        }
                                      }

                                      deepNestedFields.push({
                                        name: deepPropName,
                                        type: deepFieldType
                                      });
                                    }
                                  }
                                }

                                if (deepNestedFields.length > 0) {
                                  nestedFieldType = 'Object';
                                  nestedFields.push({
                                    name: nestedPropName,
                                    type: nestedFieldType,
                                    nestedFields: deepNestedFields
                                  });
                                  continue;
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
                  } else if (ts.Node.isArrayLiteralExpression(propValue)) {
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

                            if (typeText.includes('ObjectId') ||
                              typeText.includes('Schema.Types.ObjectId') ||
                              typeText.includes('mongoose.Schema.Types.ObjectId')) {
                              const refProperty = firstElement.getProperty('ref');
                              if (refProperty && ts.Node.isPropertyAssignment(refProperty)) {
                                const refValue = refProperty.getInitializer();
                                if (refValue) {
                                  refModel = refValue.getText().replace(/['"]/g, '');
                                }
                              }
                            }
                          }
                        } else {
                          // HANDLING THE SCENARIO THAT IT MIGHT BE AN ARRAY OF COMPLEX OBJECTS
                          nestedFields = [];
                          const arrayContent = firstElement.getText();

                          // EXTRACTING NESTED FIELDS
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
                            else if (nestedTypeStr.includes('Array')) { nestedType = 'Array'; }
                            else if (nestedTypeStr.includes('Object')) { nestedType = 'Object'; }
                            else if (nestedTypeStr.includes('ObjectId')) { nestedType = 'ObjectId'; }

                            nestedFields.push({
                              name: nestedName,
                              type: nestedType
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

    // SCENARIO 5: TYPESCRIPT INTERFACES/TYPES
    if (fields.length === 0) {
      const interfaces = sourceFile.getInterfaces();
      for (const interfaceDecl of interfaces) {
        const properties = interfaceDecl.getProperties();
        for (const prop of properties) {
          const propName = prop.getName();
          const typeNode = prop.getTypeNode();
          let fieldType: SchemaField['type'] = 'Unknown';

          if (typeNode) {
            const typeText = typeNode.getText();
            if (typeText.includes('string')) { fieldType = 'String'; }
            else if (typeText.includes('number')) { fieldType = 'Number'; }
            else if (typeText.includes('boolean')) { fieldType = 'Boolean'; }
            else if (typeText.includes('Date')) { fieldType = 'Date'; }
            else if (typeText.includes('[]') || typeText.includes('Array')) { fieldType = 'Array'; }
            else if (typeText.includes('object')) { fieldType = 'Object'; }
          }

          fields.push({ name: propName, type: fieldType });
        }
      }

      // EXTRACTING FROM TYPE ALIASES
      const typeAliases = sourceFile.getTypeAliases();
      for (const typeAlias of typeAliases) {
        const aliasTypeNode = typeAlias.getTypeNode();

        if (aliasTypeNode && ts.Node.isTypeLiteral(aliasTypeNode)) {
          const members = aliasTypeNode.getMembers();

          for (const member of members) {
            if (ts.Node.isPropertySignature(member)) {
              const propName = member.getName();
              const memberTypeNode = member.getTypeNode();
              let fieldType: SchemaField['type'] = 'Unknown';

              if (memberTypeNode) {
                const typeText = memberTypeNode.getText();
                if (typeText.includes('string')) { fieldType = 'String'; }
                else if (typeText.includes('number')) { fieldType = 'Number'; }
                else if (typeText.includes('boolean')) { fieldType = 'Boolean'; }
                else if (typeText.includes('Date')) { fieldType = 'Date'; }
                else if (typeText.includes('[]') || typeText.includes('Array')) { fieldType = 'Array'; }
                else if (typeText.includes('object')) { fieldType = 'Object'; }
              }

              fields.push({ name: propName, type: fieldType });
            }
          }
        }
      }
    }

    // SCENARIO 6: FALLBACK TO REGEX
    if (fields.length === 0) {
      console.log("No fields found with AST parsing, trying regex fallback");
      fields.push(...extractFieldsWithRegex(code));
    }

  } catch (error) {
    console.error('Error extracting keys:', error);
    fields.push(...extractFieldsWithRegex(code));
  }

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


