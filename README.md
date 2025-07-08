# AI Pair ++ 🤖💻

A revolutionary AI-powered collaborative coding platform that brings pair programming to the next level with real-time collaboration, intelligent AI assistance, and seamless team workflows.

# AI Pair Programming ++

AI-powered collaborative code editor with real-time syncing and Google authentication.

## 📸 Screenshot

![App Screenshot](https://raw.githubusercontent.com/LlaryBett/AI-Pair-Programming-Application/main/client/src/assets/Screenshot.png)



## ✨ Features

### 🤝 Real-time Collaboration
- **Live Code Sharing** - Multiple developers can edit code simultaneously
- **Real-time Cursors** - See where your teammates are working
- **Instant Updates** - Changes sync across all connected users
- **Voice Commands** - Control the editor with voice input
- **Smart Invitations** - Invite collaborators via email with role-based access

### 🧠 AI-Powered Assistance
- **Intelligent Code Suggestions** - AI-powered code completion and optimization
- **Code Explanation** - Get detailed explanations of complex code
- **Bug Detection** - Real-time error detection and fixing suggestions
- **Chat-based Interface** - ChatGPT-style conversation with your code
- **Multiple Language Support** - TypeScript, JavaScript, Python, and more

### 👥 Team Management
- **Role-based Access** - Owner, Editor, and Viewer permissions
- **Document Ownership** - Transfer ownership between team members
- **Invitation System** - Secure email invitations with expiration
- **Online Status** - See who's currently active on your documents

### 🎨 Modern UI/UX
- **Dark/Light Themes** - Switch between themes seamlessly
- **Interactive Onboarding** - Guided tour for new users
- **Responsive Design** - Works perfectly on all devices
- **Command Palette** - Quick access to all features
- **Toast Notifications** - Real-time feedback for all actions

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **Zustand** - Lightweight state management
- **Framer Motion** - Smooth animations and transitions
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide Icons** - Beautiful, customizable icons
- **Firebase Auth** - Secure authentication with Google

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.io** - Real-time bidirectional communication
- **MongoDB** - NoSQL database with Mongoose ODM
- **JWT** - JSON Web Tokens for authentication
- **Nodemailer** - Email service integration
- **Brevo SMTP** - Email delivery service

### Development Tools
- **Vite** - Fast build tool and dev server
- **ESLint** - Code linting and formatting
- **Vercel** - Frontend deployment platform
- **Git** - Version control

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MongoDB
- Firebase Project
- Brevo Account (for emails)

### Clone the Repository
```bash
git clone https://github.com/LlaryBett/AI-Pair-Programming-Application.git
cd ai-pair-++
```

### Backend Setup
```bash
cd server
npm install

# Create .env file
cp .env.example .env

# Add your environment variables
MONGODB_URI=mongodb://localhost:27017/ai-pair-plus
JWT_SECRET=your-jwt-secret
CLIENT_URL=http://localhost:5173
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your-brevo-email
BREVO_SMTP_PASSWORD=your-brevo-password
EMAIL_SENDER_NAME="AI Pair ++"
EMAIL_SENDER_ADDRESS=noreply@yourapp.com

# Start the server
npm run dev
```

### Frontend Setup
```bash
cd client
npm install

# Create .env file
cp .env.example .env

# Add your environment variables
VITE_BACKEND_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# Start the development server
npm run dev
```

## 🌐 Environment Variables

### Backend (.env)
```env
# Database
MONGODB_URI=mongodb://localhost:27017/ai-pair-plus

# JWT
JWT_SECRET=your-super-secret-jwt-key

# URLs
CLIENT_URL=http://localhost:5173

# Email Service (Brevo)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your-brevo-email
BREVO_SMTP_PASSWORD=your-brevo-password
EMAIL_SENDER_NAME="AI Pair ++"
EMAIL_SENDER_ADDRESS=noreply@yourapp.com

# Development
NODE_ENV=development
```

### Frontend (.env)
```env
# Backend API
VITE_BACKEND_URL=http://localhost:5000

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

## 🏗️ Architecture

```
ai-pair-plus/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/         # Zustand state management
│   │   ├── utils/         # Utility functions
│   │   └── main.jsx       # App entry point
│   ├── public/            # Static assets
│   └── vercel.json        # Vercel deployment config
├── server/                # Node.js backend
│   ├── controllers/       # Route controllers
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── utils/            # Utility functions
│   └── server.js         # Server entry point
└── README.md
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Collaboration
- `POST /api/invitations` - Send invitation
- `GET /api/invitations/pending` - Get pending invitations
- `GET /api/invitations/link/:token` - Get invitation by link
- `POST /api/invitations/:token/accept` - Accept invitation
- `POST /api/invitations/:id/cancel` - Cancel invitation

### Documents
- `GET /api/documents/:id/collaborators` - Get document collaborators
- `PATCH /api/collaborators/:id/role` - Update collaborator role
- `DELETE /api/collaborators/:id` - Remove collaborator
- `POST /api/documents/:id/transfer-ownership` - Transfer ownership

### Real-time Events (Socket.io)
- `code:change` - Code editor changes
- `cursor:move` - Cursor position updates
- `collaborator:join` - User joins document
- `collaborator:leave` - User leaves document
- `collaborator:role-changed` - Role updates

## 🎯 Usage

### Starting a Collaboration Session
1. **Sign in** with your Google account
2. **Create or open** a document
3. **Invite collaborators** using the collaboration panel
4. **Start coding** together in real-time!

### Using AI Assistance
1. **Type your code** in the editor
2. **Ask questions** in the AI chat panel
3. **Get explanations** and suggestions
4. **Apply AI recommendations** to improve your code

### Voice Commands
1. **Click the microphone** button
2. **Say commands** like "Explain this function"
3. **View results** in the AI chat panel

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd client
npm run build
vercel --prod
```

### Backend (Railway/Heroku)
```bash
cd server
# Set environment variables in your hosting platform
# Deploy using platform-specific commands
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Use semantic commit messages

## 🐛 Known Issues

- [ ] Voice recognition may not work in all browsers
- [ ] Large files (>1MB) may cause performance issues
- [ ] Offline mode not yet implemented

## 🔮 Roadmap

- [ ] **Video/Audio Calls** - Integrated voice and video chat
- [ ] **Code Review Tools** - Built-in review and approval workflow
- [ ] **Version Control** - Git integration with branching
- [ ] **Plugin System** - Extensible architecture for third-party plugins
- [ ] **Mobile App** - React Native mobile application
- [ ] **AI Code Generation** - Full function/class generation
- [ ] **Offline Mode** - Work without internet connection

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Your Name** -DEV Llary

## 🙏 Acknowledgments

- OpenAI for AI integration possibilities
- Firebase for authentication services
- Vercel for hosting platform
- The open-source community for amazing tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/LlaryBett/AI-Pair-Programming-Application/issues)
- **Email**: bettllary672@gmail.com


---

**Made with ❤️ by the AI Pair ++ Team**

⭐ **Star this repo if you found it helpful!**
