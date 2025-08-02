# Creative Business Toolkit

## Overview

This full-stack web application serves as a comprehensive digital workspace for entrepreneurs. It provides tools for content planning, time blocking, finance tracking, and inspiration management. The project aims to empower users with an integrated toolkit to streamline their creative business operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (Updated: August 2, 2025)

### Individual Board Layout Alignment Fixed
- **Issue**: Individual inspiration board view content hidden behind sidebar on deployed app
- **Root Cause**: Missing responsive margin offset (lg:ml-64) to account for sidebar width
- **Solution**: Applied lg:ml-64 margin to all layout states (loading, error, main content) in inspiration-board-detail.tsx
- **Status**: ✅ RESOLVED - Board content now properly aligned with main hub page layout
- **Date**: August 2, 2025

### Inspiration Hub Board Creation Fixed
- **Issue**: Board creation failing with empty request body despite frontend sending correct data
- **Root Cause**: Missing Content-Type: application/json header in POST requests
- **Solution**: Enhanced apiRequest function in queryClient.ts to automatically add Content-Type header for POST/PATCH/PUT requests with body
- **Status**: ✅ RESOLVED - Backend successfully creating boards (tested with curl, Board ID 8 created)
- **Date**: August 1, 2025

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
- **Authentication**: Secure JWT-based system with user account creation, login, and profile management.
- **Database Integration**: PostgreSQL with Drizzle ORM for type-safe, persistent storage of all user data across toolkit modules. Migrations are managed via drizzle-kit.
- **User Interface**: Responsive design with a mobile-first approach, featuring a sidebar navigation and a consistent card-based layout. Supports dark mode.
- **API Layer**: RESTful API with Express, incorporating middleware for authentication, logging, and centralized error handling. Zod schemas are used for data validation.
- **Data Flow**: Frontend interacts with Express API, which performs Drizzle ORM operations on PostgreSQL. React Query manages server state for UI updates.
- **Modularity**: Toolkit modules are designed as standalone components integrated into a cohesive system, supporting both internal and external (Canva links) template types.
- **Real-time Interaction**: Features like the timer, image management, and planning tools include auto-save functionality with debouncing, toast notifications, and optimistic UI updates.
- **Cross-page Persistence**: Global timer system uses Web Workers and localStorage for seamless persistence across tabs and page reloads. All user data from toolkit modules is persisted to the PostgreSQL database.
- **Theming**: Consistent visual branding with a focus on clean aesthetics and specific color palettes (e.g., cream, mint, coral for login/branding; various gradients for module cards).
- **Accessibility**: ARIA-compliant components via Radix UI.
- **Data Export**: Capabilities for CSV and PDF exports for various planning tools.

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
- **html2canvas**: For capturing DOM elements as images (for PDF export)
- **jspdf**: For generating PDFs
- **zod**: Schema validation