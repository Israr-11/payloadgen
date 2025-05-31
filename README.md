# PayloadGen ❴ ⚡ ❵

> **Generate realistic API payloads instantly from your code**

**PayloadGen** is a powerful Visual Studio Code extension that scans your JavaScript/TypeScript code and generates realistic dummy data for API testing. It is especially useful for **Express (js, ts) ** and **Mongoose/MongoDB** workflows.

**PayloadGen Demo:** [View Demo](https://res.cloudinary.com/cloudupload11111/video/upload/v1748684232/opensource/PayloadGen%20Demo.mp4)

---

## Features

- **One-Click Generation** – Select the code, open command palette, search PayloadGen, click, and boom: realistic payloads.
- **Smart Field Detection** – Understands `req.body`, Mongoose schemas, and more.
- **Realistic Data** – Generates context-aware dummy data for simple to complex keys
- **Complex Structures** – Supports nested objects, arrays, enums, ObjectId references, and more.
- **MongoDB Support** – Deep integration with Mongoose schema conventions.
- **Copy & Save** – Instantly copy or export the payloads as JSON files.

---

## 📥 Installation

### VS Code Marketplace

1. Open **VS Code**
2. Press `Ctrl+Shift+X` or `Cmd+Shift+X`
3. Search for `PayloadGen`
4. Click **Install**

---

## ⚙️ How to Use

1. **Select the Code**  
   Highlight a route handler, Mongoose schema, or object with field definitions.

2. **Run the Command**    
   - `Ctrl+Shift+P` / `Cmd+Shift+P` → Search `PayloadGen`

3. **View the Payload**  
   A new editor tab shows the generated payload.

4. **Copy or Save**  
   Use the UI buttons to copy or download it as a `.json` file.

---

## Examples

### From Mongoose Schema

```javascript
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  age: Number,
  role: { type: String, enum: ['admin', 'user', 'guest'] },
  address: {
    street: String,
    city: String,
    zipcode: String
  },
  createdAt: { type: Date, default: Date.now }
});
```

#### Generates:

```json
{
  "name": "Roman",
  "email": "Ulices.Trantow@hotmail.com",
  "age": 36,
  "role": "guest",
  "address": {
    "street": "43280 Schulist Vista",
    "city": "Lelahberg",
    "zipcode": "87184"
  },
  "createdAt": "2025-05-30T19:45:24.606Z"
}
```
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

### From Express Route Handler

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

```typescript
import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

interface Product {
  name: string;
  description: string;
  price: number;
  inStock: boolean;
  tags: string[];
}

app.post('/products', (req: Request, res: Response): void => {
  const body = req.body as Product;

  if (!body.name || typeof body.price !== 'number') {
    res.status(400).json({ error: 'Invalid product data' });
    return;
  }

  res.status(201).json({ message: 'Product created', product: body });
});


```

#### Generates:

```json
{
  "name": "Harley",
  "description": "Nobis temporibus capitulus tamisium talus degusto abbas coruscus adipisci. Tergiversatio defungo admitto cunabula abbas. Textilis degenero sophismata crustulum crudelis cubicularis.",
  "price": 859,
  "inStock": false,
  "tags": [
    "where",
    "experience",
    "distinction"
  ]
}
```


### Supported Field Types

PayloadGen recognizes and generates appropriate data for:

- **Basic Types**  
  Strings, Numbers, Booleans, Dates

- **Complex Types**  
  Objects, Arrays, Maps

- **MongoDB Types**  
  ObjectId references

- **Common Fields**  
  Emails, names, addresses, phone numbers, and many more

### Project Structure
```
payloadgen/
├── .vscode/
├── dist/
├── node_modules/
├── src/
│ ├── commands/
│ │ └── generateFakePayload.ts
│ ├── core/
│ │ ├── extractor.ts
│ │ └── faker.ts
│ ├── test/
│ │ ├── extension.test.ts
│ │ └── generateFakePayload.test.ts
│ ├── types/
│ │ └── index.ts
│ ├── ui/
│ │ └── PayloadPanel.ts
│ └── extension.ts
├── .eslintrc.json
├── .gitignore
├── package.json
├── tsconfig.json
└── webpack.config.js
```
### Key Files Explained

- **`extension.ts`**  
  Entry point that registers commands and activates the extension.

- **`commands/generateFakePayload.ts`**  
  Implements the main command logic.

- **`core/extractor.ts`**  
  Analyzes code to extract field information using AST parsing.

- **`core/faker.ts`**  
  Generates appropriate fake data based on field names and types.

- **`ui/PayloadPanel.ts`**  
  Creates and manages the webview panel that displays the payload.

- **`types/index.ts`**  
  Contains TypeScript interfaces and types used throughout the project.

### Architecture

**PayloadGen** follows a modular architecture:

- **Command Layer**  
  Handles user interactions and VS Code integration

- **Core Layer**  
  Contains the business logic for code analysis and data generation

- **UI Layer**  
  Manages the presentation of generated payloads

---

**Data Flow:**

1. The user selects the code and triggers the command  
2. `Extractor` analyzes the code to identify fields and their types  
3. `Faker` generates appropriate data for each field  
4. `PayloadPanel` displays the result in a formatted, interactive view


### Configuration

No configuration needed! **PayloadGen** works out of the box.

---

### Feedback and Support

-  Report bugs or request features on the [GitHub Issues](https://github.com/Israr-11/payloadgen/issues) page  
-  Have questions or feedback? Join the conversation on [GitHub Discussions](https://github.com/Israr-11/payloadgen/discussions)

---

### Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository  
2. Create a feature branch

   ```bash
   git checkout -b feature/amazing-feature
```
3. Make changes

Install the node modules, then carefully make your changes to the codebase to ensure everything works smoothly:

```bash
npm install
```
Build the extension using
```bash
npm run compile
```
Launch the extension in debug mode by pressing F5 in VS Code to open a new window with the extension loaded

4. Run tests
```bash
npm test
```
5. Commit changes
```bash
git commit -m 'Add some amazing feature'
```
6. Push to your branch
```bash
git push origin feature/amazing-feature
```
7. Open a Pull Request

### Contribution Guidelines

- Follow existing code style and naming conventions  
- Add tests for any new features  
- Update documentation as necessary  
- Keep pull requests focused on a single feature or bug fix

### License
This project is licensed under the MIT License - see the LICENSE file for details.

### Author
Created with ❤️ by [Israr](https://github.com/Israr-11)

Enjoy faster API testing with PayloadGen ❴ ⚡ ❵
