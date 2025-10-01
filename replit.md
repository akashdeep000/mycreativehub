# Creative Business Toolkit

## Overview

This full-stack web application is designed as a comprehensive digital workspace for entrepreneurs. It provides an integrated suite of tools for content planning, time blocking, finance tracking, and inspiration management. The project's core purpose is to streamline creative business operations and empower users with a cohesive platform to manage various aspects of their ventures.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI
- **Form Handling**: React Hook Form with Zod

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM
- **Authentication**: Custom JWT-based system
- **Session Management**: Express sessions with PostgreSQL storage

### Key Features & Design Patterns
- **Authentication**: Secure JWT-based system for user management.
- **Database Integration**: PostgreSQL with Drizzle ORM for type-safe, persistent storage.
- **User Interface**: Responsive, mobile-first design with sidebar navigation and consistent card-based layout, including dark mode support.
- **API Layer**: RESTful Express API with middleware for authentication, logging, and error handling, utilizing Zod for validation.
- **Data Flow**: Frontend interacts with the Express API, which uses Drizzle ORM for PostgreSQL operations. React Query manages server state.
- **Modularity**: Toolkit modules are designed as standalone components for a cohesive system, supporting internal and external template types.
- **Real-time Interaction**: Features include auto-save with debouncing, toast notifications, and optimistic UI updates.
- **Cross-page Persistence**: A global timer system uses Web Workers and localStorage for persistence, while all user data is persisted in PostgreSQL.
- **Theming**: Consistent visual branding with specific color palettes and clean aesthetics.
- **Accessibility**: ARIA-compliant components via Radix UI.
- **Data Export**: Capabilities for CSV and PDF exports.
- **Optimistic Concurrency Control**: Implemented for single-document persistence (e.g., cheat sheets) to ensure data integrity with versioning, conflict detection, and user-controlled resolution.
- **External Integrations**: Webhook system for services like Systeme.io to manage access control (e.g., course whitelisting).

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Type-safe ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight React router
- **jsonwebtoken**: For JWT authentication
- **bcrypt**: Password hashing
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **html2canvas**: For capturing DOM elements as images
- **jspdf**: For generating PDFs
- **zod**: Schema validation