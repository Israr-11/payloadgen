import { faker } from '@faker-js/faker/locale/en';
import { SchemaField } from '../types/index';

export function generateFakePayload(fields: SchemaField[]): Record<string, any> {
  const payload: Record<string, any> = {};
  
  // Filter out metadata fields that shouldn't be included in the payload
  const validFields = fields.filter(field => {
    // Skip common schema metadata fields
    const metadataFields = ['type', 'ref', 'required', 'default', 'unique', 'index', 'sparse'];
    return !metadataFields.includes(field.name.toLowerCase());
  });
  
  for (const field of validFields) {
    switch (field.name.toLowerCase()) {
      case 'email':
        payload[field.name] = faker.internet.email();
        break;
      case 'name':
      case 'firstname':
        payload[field.name] = faker.person.firstName();
        break;
      case 'lastname':
        payload[field.name] = faker.person.lastName();
        break;
      case 'username':
        payload[field.name] = faker.internet.userName();
        break;
      case 'password':
        payload[field.name] = faker.internet.password();
        break;
      case 'phone':
      case 'phonenumber':
        payload[field.name] = faker.phone.number();
        break;
      case 'address':
        payload[field.name] = faker.location.streetAddress();
        break;
      case 'city':
        payload[field.name] = faker.location.city();
        break;
      case 'country':
        payload[field.name] = faker.location.country();
        break;
      case 'zipcode':
      case 'postalcode':
        payload[field.name] = faker.location.zipCode();
        break;
      case 'avatar':
      case 'image':
      case 'photo':
      case 'picture':
        payload[field.name] = faker.image.url();
        break;
      case 'description':
      case 'bio':
        payload[field.name] = faker.lorem.paragraph();
        break;
      case 'title':
        payload[field.name] = faker.lorem.sentence();
        break;
      case 'url':
      case 'website':
        payload[field.name] = faker.internet.url();
        break;
      case 'token':
      case 'accesstoken':
      case 'refreshtoken':
        payload[field.name] = faker.string.alphanumeric(32);
        break;
      case 'id':
      case 'userid':
      case '_id':
      case 'roleid':
      case 'subscriptionid':
      case 'applicationid':
        // If it's an ObjectId type, use mongodbObjectId
        if (field.type === 'ObjectId') {
          payload[field.name] = faker.database.mongodbObjectId();
        } else {
          payload[field.name] = faker.string.uuid();
        }
        break;
      case 'age':
        payload[field.name] = faker.number.int({ min: 18, max: 80 });
        break;
      case 'date':
      case 'createdat':
      case 'updatedat':
      case 'created_at':
      case 'updated_at':
        payload[field.name] = faker.date.recent().toISOString();
        break;
      case 'role':
        if (field.enum && field.enum.length > 0) {
          const randomIndex = Math.floor(Math.random() * field.enum.length);
          payload[field.name] = field.enum[randomIndex];
        } else {
          payload[field.name] = faker.helpers.arrayElement(['admin', 'user', 'guest']);
        }
        break;
      case 'status':
      case 'isactive':
      case 'isemailverified':
        if (field.type === 'Boolean') {
          payload[field.name] = faker.datatype.boolean();
        } else if (field.enum && field.enum.length > 0) {
          const randomIndex = Math.floor(Math.random() * field.enum.length);
          payload[field.name] = field.enum[randomIndex];
        } else {
          payload[field.name] = faker.helpers.arrayElement(['active', 'inactive', 'pending']);
        }
        break;
      case 'color':
        payload[field.name] = faker.color.rgb();
        break;
      default:
        // Generate based on type
        if (field.enum && field.enum.length > 0) {
          // Use enum value if available
          const randomIndex = Math.floor(Math.random() * field.enum.length);
          payload[field.name] = field.enum[randomIndex];
        } else {
          switch (field.type) {
            case 'Number':
              payload[field.name] = faker.number.int({ min: 1, max: 1000 });
              break;
            case 'Boolean':
              payload[field.name] = faker.datatype.boolean();
              break;
            case 'Date':
              payload[field.name] = faker.date.recent().toISOString();
              break;
            case 'Array':
              payload[field.name] = [faker.word.sample(), faker.word.sample()];
              break;
            case 'Object':
              if (field.nestedFields && field.nestedFields.length > 0) {
                // Generate nested object with its fields
                const nestedObj: Record<string, any> = {};
                for (const nestedField of field.nestedFields) {
                  // Skip metadata fields in nested objects too
                  const metadataFields = ['type', 'ref', 'required', 'default', 'unique', 'index', 'sparse'];
                  if (metadataFields.includes(nestedField.name.toLowerCase())) {
                    continue;
                  }
                  
                  switch (nestedField.type) {
                    case 'String':
                      nestedObj[nestedField.name] = faker.word.sample();
                      break;
                    case 'Number':
                      nestedObj[nestedField.name] = faker.number.int({ min: 1, max: 100 });
                      break;
                    case 'Boolean':
                      nestedObj[nestedField.name] = faker.datatype.boolean();
                      break;
                    case 'Date':
                      nestedObj[nestedField.name] = faker.date.recent().toISOString();
                      break;
                    case 'Array':
                      nestedObj[nestedField.name] = [faker.word.sample(), faker.word.sample()];
                      break;
                    case 'Object':
                      nestedObj[nestedField.name] = { key: faker.word.sample() };
                      break;
                    case 'ObjectId':
                      nestedObj[nestedField.name] = faker.database.mongodbObjectId();
                      break;
                    default:
                      nestedObj[nestedField.name] = faker.word.sample();
                  }
                }
                payload[field.name] = nestedObj;
              } else {
                payload[field.name] = { key: faker.word.sample() };
              }
              break;
            case 'ObjectId':
              payload[field.name] = faker.database.mongodbObjectId();
              break;
            default:
              // Default to string for unknown types
              payload[field.name] = faker.word.sample();
          }
        }
    }
  }
  
  return payload;
}
