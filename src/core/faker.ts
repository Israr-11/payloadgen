import { faker } from '@faker-js/faker/locale/en';
import { SchemaField } from '../types/index';

export function generateFakePayload(fields: SchemaField[]): Record<string, any> {
  const payload: Record<string, any> = {};

  // FILTERING OUT METADATA FIELDS THAT SHOULD NOT BE INCLUDED IN THE PAYLOAD
  const validFields = fields.filter(field => {
    const metadataFields = ['type', 'ref', 'required', 'default', 'unique', 'index', 'sparse', 'timestamps', 'versionkey'];
    return !metadataFields.includes(field.name.toLowerCase());
  });

  for (const field of validFields) {
    // SMART FIELD DETECTION BASED ON COMMON FIELD NAMES
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
        // CHECKING IF ADDRESS IS AN OBJECT WITH NESTED FIELDS
        if (field.type === 'Object' && field.nestedFields && field.nestedFields.length > 0) {
          const addressObj: Record<string, any> = {};
          for (const nestedField of field.nestedFields) {
            switch (nestedField.name.toLowerCase()) {
              case 'street':
                addressObj[nestedField.name] = faker.location.streetAddress();
                break;
              case 'city':
                addressObj[nestedField.name] = faker.location.city();
                break;
              case 'state':
                addressObj[nestedField.name] = faker.location.state();
                break;
              case 'country':
                addressObj[nestedField.name] = faker.location.country();
                break;
              case 'zipcode':
              case 'postalcode':
              case 'zip':
                addressObj[nestedField.name] = faker.location.zipCode();
                break;
              case 'coordinates':
                if (nestedField.type === 'Object' && nestedField.nestedFields) {
                  const coordObj: Record<string, any> = {};
                  for (const coordField of nestedField.nestedFields) {
                    if (coordField.name.toLowerCase() === 'latitude') {
                      coordObj[coordField.name] = parseFloat(String(faker.location.latitude()));
                    } else if (coordField.name.toLowerCase() === 'longitude') {
                      coordObj[coordField.name] = parseFloat(String(faker.location.longitude()));
                    } else {
                      coordObj[coordField.name] = faker.number.float({ min: -180, max: 180 });
                    }
                  }
                  addressObj[nestedField.name] = coordObj;
                }
                break;
              default:
                addressObj[nestedField.name] = faker.word.sample();
            }
          }
          payload[field.name] = addressObj;
        } else {
          payload[field.name] = faker.location.streetAddress();
        }
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
      case 'resetpasswordtoken':
      case 'emailverificationtoken':
        payload[field.name] = faker.string.alphanumeric(32);
        break;
      case 'id':
      case 'userid':
      case '_id':
      case 'roleid':
      case 'subscriptionid':
      case 'applicationid':
      case 'departmentid':
      case 'managerid':
      case 'companyid':
        // IF IT IS AN OBJECTID TYPE, USE MONGODB OBJECT ID ELSE USE UUID
        if (field.type === 'ObjectId') {
          payload[field.name] = faker.database.mongodbObjectId();
        } else {
          payload[field.name] = faker.string.uuid();
        }
        break;
      case 'age':
        payload[field.name] = faker.number.int({ min: 18, max: 80 });
        break;
      case 'rating':
        payload[field.name] = faker.number.float({ min: 0, max: 5, fractionDigits: 1 });
        break;
      case 'date':
      case 'createdat':
      case 'updatedat':
      case 'created_at':
      case 'updated_at':
      case 'lastloginat':
      case 'emailverifiedat':
      case 'birthdate':
      case 'joineddate':
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
      case 'isphoneverified':
      case 'isprofilecomplete':
      case 'acceptsmarketing':
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
      case 'theme':
        if (field.enum && field.enum.length > 0) {
          const randomIndex = Math.floor(Math.random() * field.enum.length);
          payload[field.name] = field.enum[randomIndex];
        } else {
          payload[field.name] = faker.helpers.arrayElement(['light', 'dark', 'auto']);
        }
        break;
      case 'tags':
      case 'skills':
      case 'languages':
      case 'hobbies':
      case 'interests':
      case 'friendids':
      case 'groupids':
      case 'projectids':
        // GENERATING ARRAYS WITH APPROPRIATE ITEMS
        if (field.type === 'Array') {
          const arrayLength = faker.number.int({ min: 2, max: 5 });
          const items = [];

          // SPECIALIZED ARRAY HANDLING FOR OBJECT IDS
          if (field.nestedFields && field.nestedFields.length > 0 &&
            field.nestedFields[0].type === 'ObjectId') {
            for (let i = 0; i < arrayLength; i++) {
              items.push(faker.database.mongodbObjectId());
            }
          } else {
            // DEFAULT TO ARRAY OF STRINGS
            for (let i = 0; i < arrayLength; i++) {
              items.push(faker.word.sample());
            }
          }
          payload[field.name] = items;
        } else {
          payload[field.name] = [faker.word.sample(), faker.word.sample(), faker.word.sample()];
        }
        break;
      // GENERATING COMPLEX SOCIAL MEDIA OBJECTS
      case 'socialmedia':
        if (field.type === 'Array' && field.nestedFields && field.nestedFields.length > 0) {
          const platforms = ['Facebook', 'Twitter', 'LinkedIn', 'Instagram', 'GitHub'];
          const socialItems = [];

          for (let i = 0; i < 2; i++) {
            const socialObj: Record<string, any> = {};
            const platform = platforms[i % platforms.length];
            // POPULATE EACH SOCIAL MEDIA ENTRY WITH APPROPRIATE DATA
            for (const nestedField of field.nestedFields) {
              if (nestedField.name.toLowerCase() === 'platform') {
                socialObj[nestedField.name] = platform;
              } else if (nestedField.name.toLowerCase() === 'url') {
                socialObj[nestedField.name] = `https://${platform.toLowerCase()}.com/user123`;
              } else if (nestedField.name.toLowerCase() === 'username') {
                socialObj[nestedField.name] = faker.internet.userName();
              } else {
                socialObj[nestedField.name] = faker.word.sample();
              }
            }

            socialItems.push(socialObj);
          }

          payload[field.name] = socialItems;
        } else {
          payload[field.name] = [
            {
              platform: 'Twitter',
              url: 'https://twitter.com/user123',
              username: faker.internet.userName()
            },
            {
              platform: 'LinkedIn',
              url: 'https://linkedin.com/in/user123',
              username: faker.internet.userName()
            }
          ];
        }
        break;
      case 'education':
        if (field.type === 'Array' && field.nestedFields && field.nestedFields.length > 0) {
          const educationItems = [];
          const educationObj: Record<string, any> = {};

          for (const nestedField of field.nestedFields) {
            if (nestedField.name.toLowerCase() === 'institution') {
              educationObj[nestedField.name] = faker.company.name() + ' University';
            } else if (nestedField.name.toLowerCase() === 'degree') {
              educationObj[nestedField.name] = 'Bachelor of ' + faker.company.buzzNoun();
            } else if (nestedField.name.toLowerCase() === 'field') {
              educationObj[nestedField.name] = faker.company.buzzNoun();
            } else if (nestedField.name.toLowerCase() === 'startdate') {
              educationObj[nestedField.name] = faker.date.past({ years: 5 }).toISOString();
            } else if (nestedField.name.toLowerCase() === 'enddate') {
              educationObj[nestedField.name] = faker.date.recent().toISOString();
            } else if (nestedField.name.toLowerCase() === 'gpa') {
              educationObj[nestedField.name] = faker.number.float({ min: 2.0, max: 4.0, fractionDigits: 1 });
            } else {
              educationObj[nestedField.name] = faker.word.sample();
            }
          }

          educationItems.push(educationObj);
          payload[field.name] = educationItems;
        } else {
          payload[field.name] = [
            {
              institution: faker.company.name() + ' University',
              degree: 'Bachelor of Science',
              field: 'Computer Science',
              startDate: faker.date.past({ years: 5 }).toISOString(),
              endDate: faker.date.recent().toISOString(),
              gpa: faker.number.float({ min: 2.0, max: 4.0, fractionDigits: 1 })
            }
          ];
        }
        break;
      case 'workexperience':
        if (field.type === 'Array' && field.nestedFields && field.nestedFields.length > 0) {
          const workItems = [];
          const workObj: Record<string, any> = {};

          for (const nestedField of field.nestedFields) {
            if (nestedField.name.toLowerCase() === 'company') {
              workObj[nestedField.name] = faker.company.name();
            } else if (nestedField.name.toLowerCase() === 'position') {
              workObj[nestedField.name] = faker.person.jobTitle();
            } else if (nestedField.name.toLowerCase() === 'startdate') {
              workObj[nestedField.name] = faker.date.past({ years: 3 }).toISOString();
            } else if (nestedField.name.toLowerCase() === 'enddate') {
              workObj[nestedField.name] = faker.date.recent().toISOString();
            } else if (nestedField.name.toLowerCase() === 'description') {
              workObj[nestedField.name] = faker.lorem.paragraph();
            } else if (nestedField.name.toLowerCase() === 'salary') {
              workObj[nestedField.name] = faker.number.int({ min: 30000, max: 150000 });
            } else {
              workObj[nestedField.name] = faker.word.sample();
            }
          }

          workItems.push(workObj);
          payload[field.name] = workItems;
        } else {
          payload[field.name] = [
            {
              company: faker.company.name(),
              position: faker.person.jobTitle(),
              startDate: faker.date.past({ years: 3 }).toISOString(),
              endDate: faker.date.recent().toISOString(),
              description: faker.lorem.paragraph(),
              salary: faker.number.int({ min: 30000, max: 150000 })
            }
          ];
        }
        break;
      case 'metadata':
      case 'settings':
      case 'preferences':
        payload[field.name] = {
          setting1: faker.word.sample(),
          setting2: faker.datatype.boolean(),
          setting3: faker.number.int({ min: 1, max: 100 })
        };
        break;
      case 'sociallinks':
        if (field.type === 'Map' || field.type === 'Object') {
          const socialLinksObj: Record<string, string> = {};
          const platforms = ['twitter', 'facebook', 'linkedin', 'instagram', 'github'];

          for (let i = 0; i < 3; i++) {
            const platform = platforms[i];
            socialLinksObj[platform] = `https://${platform}.com/${faker.internet.userName()}`;
          }

          payload[field.name] = socialLinksObj;
        } else {
          payload[field.name] = {
            twitter: `https://twitter.com/${faker.internet.userName()}`,
            facebook: `https://facebook.com/${faker.internet.userName()}`,
            linkedin: `https://linkedin.com/in/${faker.internet.userName()}`
          };
        }
        break;
      default:
        // RESPECTING ENUM CONSTRAINTS
        if (field.enum && field.enum.length > 0) {
          // USING ENUM VALUE IF AVAILABLE
          const randomIndex = Math.floor(Math.random() * field.enum.length);
          payload[field.name] = field.enum[randomIndex];
        } else {
          // FALLBACK GENERATION BASED ON TYPE
          switch (field.type) {
            case 'String':
              payload[field.name] = faker.lorem.word();
              break;
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
              if (field.nestedFields && field.nestedFields.length > 0) {
                const arrayLength = faker.number.int({ min: 1, max: 3 });
                const items = [];

                for (let i = 0; i < arrayLength; i++) {
                  const item: Record<string, any> = {};

                  for (const nestedField of field.nestedFields) {
                    // GENERATING VALUE BASED ON NESTED FIELD TYPE
                    switch (nestedField.type) {
                      case 'String':
                        item[nestedField.name] = faker.lorem.word();
                        break;
                      case 'Number':
                        item[nestedField.name] = faker.number.int({ min: 1, max: 100 });
                        break;
                      case 'Boolean':
                        item[nestedField.name] = faker.datatype.boolean();
                        break;
                      case 'Date':
                        item[nestedField.name] = faker.date.recent().toISOString();
                        break;
                      case 'ObjectId':
                        item[nestedField.name] = faker.database.mongodbObjectId();
                        break;
                      default:
                        item[nestedField.name] = faker.lorem.word();
                    }
                  }

                  items.push(item);
                }

                payload[field.name] = items;
              } else {
                // DEFAULT TO ARRAY OF STRINGS
                payload[field.name] = [
                  faker.lorem.word(),
                  faker.lorem.word(),
                  faker.lorem.word()
                ];
              }
              break;
            case 'Object':
              if (field.nestedFields && field.nestedFields.length > 0) {
                const obj: Record<string, any> = {};

                for (const nestedField of field.nestedFields) {
                  switch (nestedField.type) {
                    case 'String':
                      obj[nestedField.name] = faker.lorem.word();
                      break;
                    case 'Number':
                      obj[nestedField.name] = faker.number.int({ min: 1, max: 100 });
                      break;
                    case 'Boolean':
                      obj[nestedField.name] = faker.datatype.boolean();
                      break;
                    case 'Date':
                      obj[nestedField.name] = faker.date.recent().toISOString();
                      break;
                    case 'ObjectId':
                      obj[nestedField.name] = faker.database.mongodbObjectId();
                      break;
                    case 'Object':
                      if (nestedField.nestedFields && nestedField.nestedFields.length > 0) {
                        const deepObj: Record<string, any> = {};

                        for (const deepNestedField of nestedField.nestedFields) {
                          switch (deepNestedField.type) {
                            case 'String':
                              deepObj[deepNestedField.name] = faker.lorem.word();
                              break;
                            case 'Number':
                              deepObj[deepNestedField.name] = faker.number.int({ min: 1, max: 100 });
                              break;
                            case 'Boolean':
                              deepObj[deepNestedField.name] = faker.datatype.boolean();
                              break;
                            default:
                              deepObj[deepNestedField.name] = faker.lorem.word();
                          }
                        }

                        obj[nestedField.name] = deepObj;
                      } else {
                        obj[nestedField.name] = { value: faker.lorem.word() };
                      }
                      break;
                    default:
                      obj[nestedField.name] = faker.lorem.word();
                  }
                }

                payload[field.name] = obj;
              } else {
                // DEFAULT TO SIMPLE OBJECT
                payload[field.name] = {
                  key1: faker.lorem.word(),
                  key2: faker.lorem.word()
                };
              }
              break;
            case 'ObjectId':
              payload[field.name] = faker.database.mongodbObjectId();
              break;
            default:
              // DEFAULT TO STRING FOR UNKNOWN TYPES
              payload[field.name] = faker.lorem.word();
          }
        }
    }
  }

  return payload;
}
