# Creative Business Toolkit

## Overview

This full-stack web application serves as a comprehensive digital workspace for entrepreneurs. It provides tools for content planning, time blocking, finance tracking, and inspiration management. The project aims to empower users with an integrated toolkit to streamline their creative business operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (Updated: August 17, 2025)

### Navigation Enhancement - Streamline Workflow Section
- **Issue**: Request to add 'Back to Streamline Your Workflow' button alongside existing 'Back to Main Dashboard' buttons
- **Solution**: 
  - Added "Back to Streamline Your Workflow" navigation button to inspiration-hub.tsx
  - Added proper navigation buttons to streamline-workflow.tsx template view (when viewing individual templates)
  - Fixed "Back to Streamline Workflow" button to properly reset template selection instead of attempting route navigation
  - Verified existing implementations in automation-toolkit.tsx and sop-builder-hub.tsx already had both buttons
  - Removed redundant navigation from time-blocking-planner.tsx component (template view handles navigation)
  - Ensured consistent navigation pattern across all streamline workflow section pages
- **Status**: ✅ COMPLETED - All streamline workflow pages now have proper navigation that works correctly
- **Date**: August 17, 2025

### Module Order Resequencing
- **Issue**: Request to reorder dashboard cards and navigation to specific sequence
- **Solution**: 
  - Updated navigationItems order: Streamline Workflow → Content Creation → Product Launch → Financial Management → Affiliate Hub → Resource Library
  - Added sorting utilities (moduleOrderMap, sortModulesByNavigationOrder) for consistent ordering
  - Applied sorting to dashboard cards to match navigation sequence
  - Mobile navigation automatically reflects new order through shared configuration
- **Status**: ✅ COMPLETED - All navigation areas now follow consistent module sequence
- **Date**: August 17, 2025

### Production Deployment Fixes
- **Issue**: Deployment failing with health check and initialization errors on Replit Autoscale
- **Root Cause**: Development debugging middleware interfering with production, missing proper health endpoints
- **Solution**: 
  - Added proper health check endpoints (`/health` and `/api/health`) at server startup level
  - Removed excessive CORS debugging logs and development middleware
  - Removed test endpoints that could interfere with production (`/api/test-auth`, `/api/test-board-creation`, `/api/test-production-auth`)
  - Enhanced error handling for production environment with secure error responses
  - Optimized server logging to be production-ready (conditional debug output)
  - Ensured server listens on `0.0.0.0` with proper PORT environment variable support
- **Status**: ✅ COMPLETED - Server now production-ready for Replit Deployments
- **Date**: August 15, 2025

### Time Blocking Calendar UI Enhancement
- **Issue**: Request to simplify time block interactions by removing edit icon and adding delete on hover
- **Solution**: 
  - Removed Edit2 (pencil) icon entirely from time blocks
  - Replaced X icon with Trash2 (bin) icon for cleaner delete functionality
  - Added hover-only display for delete button with red hover state
  - Updated both weekly and monthly view time blocks for consistency
  - Maintained click-to-edit functionality for block titles
- **Status**: ✅ COMPLETED - Clean hover-to-delete interface implemented
- **Date**: August 3, 2025

### Time Blocking View Data Separation Fixed
- **Issue**: Time blocks duplicating between weekly and monthly views - blocks created in one view appeared in both
- **Root Cause**: Both views using same weekKey-based filtering logic
- **Solution**: 
  - Updated TimeBlock interface to support both weekKey and monthKey fields
  - Added getCurrentMonthKey function for month-specific tracking
  - Completely separated filtering logic in getBlocksForDayAndHour:
    - Weekly view: Only shows blocks with matching weekKey
    - Monthly view: Only shows blocks with matching monthKey (ignores weekKey)
  - Enhanced createTimeBlock and handleDrop to assign correct keys based on active view
  - Updated legacy data migration to handle both key types
- **Status**: ✅ RESOLVED - Each view now maintains completely independent data storage
- **Date**: August 3, 2025

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