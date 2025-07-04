# Creative Business Toolkit

## Overview

This is a full-stack web application designed as a creative business toolkit for entrepreneurs. It provides a comprehensive digital workspace with tools for content planning, time blocking, finance tracking, and inspiration management. The application features a modern React frontend with a Node.js/Express backend, using PostgreSQL for data persistence and Replit's authentication system.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **UI Components**: Radix UI primitives for accessible, customizable components
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit's OpenID Connect authentication system
- **Session Management**: Express sessions with PostgreSQL storage

### Development Environment
- **Development Server**: Vite dev server with HMR
- **Production Build**: ESBuild for backend bundling
- **Type Checking**: TypeScript strict mode enabled
- **Code Quality**: Configured for modern ES2022+ features

## Key Components

### Authentication System
- **Provider**: Replit Auth with OpenID Connect
- **Strategy**: Passport.js integration with custom middleware
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **User Management**: Automatic user creation and profile management

### Database Layer
- **Schema**: Drizzle ORM with PostgreSQL dialect
- **Migrations**: Managed through drizzle-kit
- **Connection**: Neon serverless with WebSocket support
- **Tables**: Users, sessions, toolkit modules, daily tasks, activity logs, templates

### Frontend Components
- **Layout**: Responsive design with sidebar navigation and mobile-first approach
- **Theming**: Custom CSS variables with dark mode support
- **Accessibility**: ARIA-compliant components via Radix UI
- **Performance**: Lazy loading and optimized asset delivery

### API Layer
- **Architecture**: RESTful API with Express routes
- **Middleware**: Authentication, logging, error handling
- **Data Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error middleware with proper HTTP status codes

## Data Flow

1. **User Authentication**: Users authenticate via Replit's OAuth system
2. **Session Management**: Sessions are stored in PostgreSQL and validated on each request
3. **API Requests**: Frontend makes authenticated requests to Express API endpoints
4. **Database Operations**: Drizzle ORM handles database queries with type safety
5. **State Management**: React Query manages server state with caching and synchronization
6. **UI Updates**: Components reactively update based on server state changes

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight React router

### Authentication & Security
- **openid-client**: OpenID Connect client implementation
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **esbuild**: Fast JavaScript bundler
- **postcss**: CSS processing with Tailwind

## Deployment Strategy

### Development
- **Local Development**: Vite dev server with hot module replacement
- **Environment**: NODE_ENV=development with TypeScript compilation
- **Database**: Neon serverless PostgreSQL for consistent environment

### Production
- **Build Process**: 
  1. Vite builds frontend assets to `dist/public`
  2. ESBuild bundles backend to `dist/index.js`
- **Deployment**: Single process serving both static files and API
- **Environment**: NODE_ENV=production with optimized assets
- **Database**: Same Neon instance with production configuration

### Configuration
- **Environment Variables**: 
  - `DATABASE_URL`: PostgreSQL connection string
  - `SESSION_SECRET`: Session encryption key
  - `ISSUER_URL`: OpenID Connect issuer
  - `REPL_ID`: Replit application identifier

## Changelog

Changelog:
- July 04, 2025. Initial setup
- July 04, 2025. Enhanced authentication system:
  - Created custom login page with brand styling (cream background #fff7e5, mint logo, coral buttons #f46454)
  - Updated landing page to redirect authenticated users to dashboard
  - Changed "Get Started" button to "Enter Your Dashboard" 
  - Added /login route with friendly copy: "Welcome back to your Creative Toolkit!"
  - Implemented secure user authentication with Replit Auth (OpenID Connect)
  - Added logout functionality in sidebar navigation
  - Users are automatically redirected to dashboard after login
- July 04, 2025. Restructured homepage layout:
  - Login page is now the main homepage (/) with large title and subtitle
  - Removed feature sections from login page - users see toolkit modules in dashboard
  - Dashboard shows all toolkit modules after successful authentication
  - Streamlined user flow: homepage login → dashboard with full toolkit access

## User Preferences

Preferred communication style: Simple, everyday language.