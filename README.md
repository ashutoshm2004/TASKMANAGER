# TaskFlow — Team Task Manager

A full-stack web app for managing projects and tasks with role-based access control.

## Features

- **Authentication** — Signup/Login with JWT, role-based (Admin / Member)
- **Project Management** — Create, edit, delete projects; manage members
- **Task Tracking** — Create tasks, assign to members, set priority & due dates
- **Kanban Board** — Drag-style status updates (Todo → In Progress → Done)
- **Dashboard** — Overview of all projects, tasks, stats, and overdue items
- **My Tasks** — View all tasks assigned to you across projects
- **Role-Based Access** — Admins manage everything; Members see/edit their own

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, React Router v6 |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| Deployment | Railway |

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd taskflow
npm run install:all
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and set JWT_SECRET

# Frontend (optional for local dev — proxy handles it)
cp frontend/.env.example frontend/.env
```

### 3. Run Development

```bash
npm run dev
```

This starts:
- Backend API → http://localhost:5000
- Frontend → http://localhost:3000

## Deploy to Railway

### 1. Build Frontend
```bash
cd frontend && npm run build
cd ..
```

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

### 3. Deploy on Railway
1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repo
3. Set environment variables:
   - `JWT_SECRET` = any long random string
   - `NODE_ENV` = production
4. Railway auto-detects Node.js and deploys

The app serves the React frontend from Express in production (single service deployment).

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auth/users` | List all users |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List my projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project detail |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:projectId/tasks` | List tasks |
| POST | `/api/projects/:projectId/tasks` | Create task |
| PUT | `/api/projects/:projectId/tasks/:taskId` | Update task |
| DELETE | `/api/projects/:projectId/tasks/:taskId` | Delete task |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Summary stats |

## Project Structure

```
taskflow/
├── backend/
│   ├── db/database.js        # SQLite setup & schema
│   ├── middleware/auth.js    # JWT + role middleware
│   ├── routes/
│   │   ├── auth.js           # Auth endpoints
│   │   ├── projects.js       # Project CRUD + members
│   │   ├── tasks.js          # Task CRUD
│   │   └── dashboard.js      # Stats aggregation
│   └── server.js             # Express app
├── frontend/
│   └── src/
│       ├── context/AuthContext.js
│       ├── components/Layout.js
│       ├── pages/
│       │   ├── AuthPage.js
│       │   ├── Dashboard.js
│       │   ├── Projects.js
│       │   ├── ProjectDetail.js
│       │   └── MyTasks.js
│       ├── api.js
│       ├── App.js
│       └── index.css
├── package.json              # Root with concurrently
└── railway.json              # Railway config
```

## Demo Walkthrough

1. **Sign up** as Admin → create a project
2. **Sign up** as Member (different tab/browser)  
3. In project Settings → Members → add the Member user
4. As Member: login, view the project, create and manage tasks
5. Dashboard shows live stats, overdue highlights, progress bars

## Author

Built for the Team Task Manager assignment.
