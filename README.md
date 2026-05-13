# 🔐 RB Task Manager Application

A full-stack web application for creating and managing tasks with **AES-256 encrypted file attachments**. Built with React, Node.js, Express, and MongoDB.

## ✨ Features

### Core Features

- ✅ **User Authentication** - Secure JWT-based authentication
- ✅ **Password Security** - bcrypt password hashing
- ✅ **Protected Routes** - Authorization middleware
- ✅ **CRUD Operations** - Create, Read, Update, Delete tasks
- ✅ **File Encryption** - AES-256-CBC encryption for all file attachments
- ✅ **Secure Downloads** - Encrypted files are decrypted on-demand
- ✅ **Pin Tasks** - Mark important tasks as pinned
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile

### Security Features

- 🔒 **End-to-End Encryption** - Files encrypted before storage
- 🔒 **Secure Key Management** - Encryption keys stored in environment variables
- 🔒 **User Isolation** - Users can only access their own tasks and files
- 🔒 **JWT Authentication** - Stateless authentication with tokens
- 🔒 **Password Hashing** - bcrypt with salt rounds
- 🔒 **File Validation** - Type and size restrictions

## 🏗️ Architecture

```
rb-task-manager/
├── server/                 # Backend (Node.js + Express)
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Auth & error handling
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── utils/             # Utilities (encryption, file upload)
│   ├── .env.example       # Environment variables template
│   ├── package.json
│   └── server.js          # Entry point
│
└── client/                # Frontend (React + Vite)
    ├── src/
    │   ├── components/    # React components
    │   ├── context/       # Auth context
    │   ├── pages/         # Page components
    │   ├── utils/         # API client
    │   ├── App.jsx        # Main app component
    │   └── main.jsx       # Entry point
    ├── package.json
    └── vite.config.js
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 16.x
- **MongoDB** >= 5.x (running locally or MongoDB Atlas)
- **npm** or **yarn**

### 1. Clone the Repository

```bash
cd rb-task-manager
```

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Generate encryption key (IMPORTANT!)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output and paste it as ENCRYPTION_KEY in .env

# Edit .env file with your configuration
nano .env
```

**Required Environment Variables:**

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/rb-task-manager-db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# File Encryption (32-byte hex key)
ENCRYPTION_KEY=<paste-your-generated-key-here>

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

**Start the backend server:**

```bash
npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend Setup

Open a new terminal:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm run dev
# App runs on http://localhost:3000
```

### 4. Access the Application

Open your browser and navigate to:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api

## 📖 API Documentation

### Authentication Endpoints

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Tasks Endpoints

#### Create Task

```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "My Task",
  "content": "Task content here",
  "isPinned": false,
  "file": <file> (optional)
}
```

#### Get All Tasks

```http
GET /api/tasks
Authorization: Bearer <token>
```

#### Get Single Task

```http
GET /api/tasks/:id
Authorization: Bearer <token>
```

#### Update Task

```http
PUT /api/tasks/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "Updated Title",
  "content": "Updated content",
  "isPinned": true,
  "file": <file> (optional)
}
```

#### Delete Note

```http
DELETE /api/notes/:id
Authorization: Bearer <token>
```

#### Download File

```http
GET /api/notes/:id/file
Authorization: Bearer <token>
```

#### Delete File

```http
DELETE /api/notes/:id/file
Authorization: Bearer <token>
```

## 🔐 Encryption Details

### How File Encryption Works

1. **Upload**: User uploads a file through the frontend
2. **Storage**: Multer saves the file temporarily
3. **Encryption**:
   - Generate random IV (Initialization Vector)
   - Encrypt file using AES-256-CBC with encryption key
   - Save encrypted file with `.encrypted` extension
   - Delete original unencrypted file
4. **Database**: Store encrypted file path and IV in MongoDB
5. **Download**:
   - Retrieve encrypted file path and IV from database
   - Decrypt file using stored IV and encryption key
   - Send decrypted buffer to authorized user

### Security Measures

- ✅ **32-byte encryption key** (256-bit)
- ✅ **Unique IV per file** for semantic security
- ✅ **Original files deleted** after encryption
- ✅ **Encrypted paths never exposed** to frontend
- ✅ **User authorization check** before decryption
- ✅ **Files stored encrypted** at rest

## 🛠️ Tech Stack

### Backend

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **multer** - File upload handling
- **crypto** (Node.js built-in) - File encryption

### Frontend

- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **CSS3** - Styling

## 📝 Usage Guide

### Creating Your First Note

1. **Register** a new account
2. **Login** with your credentials
3. Click **"Create Note"** button
4. Fill in:
   - Title
   - Content
   - (Optional) Upload a file
   - (Optional) Pin the note
5. Click **"Create Note"**

### Uploading Encrypted Files

1. Create or edit a note
2. Click the file input or drag a file
3. Supported formats:
   - Images: JPG, PNG, GIF, WebP
   - Documents: PDF, DOC, DOCX, XLS, XLSX, TXT
   - Archives: ZIP
4. Max file size: **10MB**
5. File is **automatically encrypted** before storage

### Downloading Files

1. Open a note with an attached file
2. Click **"Download"** button
3. File is **decrypted on-the-fly** and downloaded
4. Only the note owner can download

## 🔒 Security Best Practices

### For Production Deployment

1. **Change all secrets** in `.env`:

   ```bash
   # Generate new JWT secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

   # Generate new encryption key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Use strong passwords** for MongoDB

3. **Enable HTTPS** with SSL certificates

4. **Set secure environment variables**:

   ```env
   NODE_ENV=production
   ```

5. **Implement rate limiting** for API endpoints

6. **Regular security audits**:

   ```bash
   npm audit
   npm audit fix
   ```

7. **Backup encryption keys** securely

8. **Use MongoDB Atlas** for production database

9. **Enable CORS** only for trusted domains

10. **Implement logging** and monitoring

## 🧪 Testing

### Test User Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Create Note

```bash
curl -X POST http://localhost:5000/api/notes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Note" \
  -F "content=This is a test note" \
  -F "file=@/path/to/file.pdf"
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Or use MongoDB Atlas connection string
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### File Upload Errors

- Check `uploads/` directory exists and has write permissions
- Verify file size is under 10MB
- Ensure file type is in allowed list

### Encryption Key Errors

- Must be exactly 64 hex characters (32 bytes)
- Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 📦 Building for Production

### Backend

```bash
cd server
npm install --production
npm start
```

### Frontend

```bash
cd client
npm run build
# Serve the dist/ folder with a static server
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by security-first design principles
- Community-driven development

## 📞 Support

For issues, questions, or contributions:

- Open an issue on GitHub
- Contact the development team

---

**⚠️ Security Notice**: This application implements industry-standard encryption. However, always conduct your own security audit before deploying to production with sensitive data.

**Made with ❤️ and 🔐**
