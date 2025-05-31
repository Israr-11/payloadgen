# PayloadGen ❴ ⚡ ❵

> **Generate realistic API payloads instantly from code**

**PayloadGen** is a powerful Visual Studio Code extension that scans JavaScript/TypeScript code and generates realistic dummy data for API testing. Perfect for **Express.js** and **Mongoose/MongoDB** workflows.

**PayloadGen Demo:** [View Demo](https://res.cloudinary.com/cloudupload11111/image/upload/v1748714275/opensource/payloadgen_demos/Part_1_Gif_JS_Mongoose_wov2ja.gif)

---

## Installation

1. Open **VS Code**
2. Press `Ctrl+Shift+X` or `Cmd+Shift+X` on Mac
3. Search for `PayloadGen`
4. Click **Install**

## How to Use

1. **Select the Code**  
   Highlight a route handler, Mongoose schema, or object with field definitions.

2. **Run the Command**    
   - Right-click and select "Generate API Payload" from the context menu, or
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P` and search for "Generate API Payload"

3. **View the Payload**  
   A new panel shows your generated payload with syntax highlighting.

4. **Copy or Save**  
   Use the buttons to copy to clipboard or save as a JSON file.

## Features

- **One-Click Generation**: Select code, run command, get instant realistic payloads
- **Smart Field Detection**: Automatically identifies fields from req.body, Mongoose schemas, and more
- **Realistic Data**: Generates contextually appropriate data (emails for email fields, addresses for address fields, etc.)
- **Complex Structure Support**: Handles nested objects, arrays, and references
- **MongoDB Integration**: Special support for ObjectId references and Mongoose schema patterns
- **Copy & Save**: Easily copy payloads to clipboard or save as JSON files

---

## 📚 Documentation

For comprehensive documentation including architecture details, contribution guidelines, and advanced usage examples, visit our [Documentation Site](https://israr-11.github.io/payloadgen/).

## Examples

### From Mongoose Schema

#### TypeScript-based Mongoose Schema

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    age?: number;
    role?: 'admin' | 'user' | 'guest';
    address?: string;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, unique: true },
    age: { type: Number },
    role: { type: String, enum: ['admin', 'user', 'guest'] },
    address: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);

```

#### Generates:

```json
{
  "name": "Shaina",
  "email": "Alvena.Lowe-Lakin26@gmail.com",
  "age": 62,
  "role": "user",
  "address": "582 Nick Motorway",
  "createdAt": "2025-05-31T03:55:33.909Z"
}
```

### From Express route Handler
#### JavaScript-based route handler

```javascript
app.post("/blog", (req, res) => {
  const { title, content, author, tags, published } = req.body;
  res.status(201).json({ message: "Blog post created" });
});

```

#### Generates:

```json
{
  "title": "Adversus pel synagoga uredo audax suscipio subiungo pauci usitas.",
  "content": "uxor",
  "author": "blandior",
  "tags": [
    "record",
    "besides",
    "including"
  ],
  "published": "tametsi"
}
```
## More Examples

See more examples of PayloadGen in action

- [Mongoose Schema (JavaScript)](https://res.cloudinary.com/cloudupload11111/image/upload/v1748714275/opensource/payloadgen_demos/Part_1_Gif_JS_Mongoose_wov2ja.gif)
- [Mongoose Schema (TypeScript)](https://res.cloudinary.com/cloudupload11111/image/upload/v1748714269/opensource/payloadgen_demos/Part_2_Gif_TS_Mongoose_abyylz.gif)
- [Express Route (JavaScript)](https://res.cloudinary.com/cloudupload11111/image/upload/v1748714268/opensource/payloadgen_demos/Part_4_Gif_TS_Route_Handler_dxamvg.gif)
- [Express Route (TypeScript)](https://res.cloudinary.com/cloudupload11111/image/upload/v1748714267/opensource/payloadgen_demos/Part_3_Gif_JS_Route_Handler_v2gxmw.gif)

## Privacy and Data Usage

PayloadGen respects your privacy

- **100% Local Processing**: All code analysis and payload generation happens locally
- **No Data Collection**: We don't collect, store, or transmit your code or generated payloads
- **No Telemetry**: We don't track usage or collect analytics

For more details, see our [Privacy Policy](https://github.com/Israr-11/payloadgen/blob/main/PRIVACY.md).

## License

This project is licensed under the MIT License with commercial restrictions - see the [LICENSE](https://github.com/Israr-11/payloadgen/blob/main/LICENSE) file for details.


### Feedback and Support

-  Report bugs or request features on the [GitHub Issues](https://github.com/Israr-11/payloadgen/issues) page  
-  Have questions or feedback? Join the conversation on [GitHub Discussions](https://github.com/Israr-11/payloadgen/discussions)

---

### Author
Created with ❤️ by [Israr](https://github.com/Israr-11)

Enjoy faster API testing with PayloadGen ❴ ⚡ ❵
