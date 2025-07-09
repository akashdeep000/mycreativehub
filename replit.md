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
- July 04, 2025. Migrated to custom authentication system:
  - Replaced Replit Auth with custom email/password authentication
  - Added bcrypt password hashing for security
  - Created sign-up page with user registration form
  - Updated login page with email/password fields and "Stay signed in" checkbox
  - Added secure session management with PostgreSQL storage
  - Updated all API routes to use new authentication format
  - Users can now create accounts and access their personal dashboards
- July 05, 2025. Updated dashboard stats tracking system:
  - Changed "Days in a Row" to "Days You Showed Up" with monthly reset functionality
  - Added PostgreSQL tracking for unique daily dashboard access per month
  - Connected real-time stats to user actions (tasks completed, focus hours, monthly engagement)
  - Added monthly stats heading with current month/year display
  - Integrated focus timer with Pomodoro technique for session tracking
- July 05, 2025. Restructured toolkit sections to match course structure:
  - Updated navigation and dashboard to new section order:
    1. Streamline Your Workflow
    2. Content Creation System 
    3. Email Marketing
    4. Product Launch System
    5. Financial Management
    6. The Affiliate Marketing Hub
  - Updated sidebar, mobile navigation, and dashboard cards with new names
  - Replaced hardcoded modules with dynamic database-driven content
  - Added proper routing and icon mapping for all new sections
  - Updated sidebar with shortened navigation titles for cleaner UI
  - Improved sidebar styling with left-aligned text and increased vertical spacing
- July 05, 2025. Redesigned Streamline Your Workflow section:
  - Switched to dashboard-style grid layout matching main hub design
  - Implemented auto-generation of pre-built templates on first visit
  - Created Creative Inspiration Hub with drag-and-drop image uploads, auto-save notes
  - Built Time Blocking Planner with weekly and monthly calendar views
  - Added drag-and-drop time blocks, resizable scheduling, real-time editing
  - Integrated archive system with dropdown menu options per template
  - Connected template workspaces with proper data persistence and API integration
- July 06, 2025. Debugging production session persistence issue:
  - Added comprehensive logging to track session creation, saving, and authentication flow
  - Verified session store is working properly with PostgreSQL (sessions table populated)
  - Updated session configuration with production-optimized settings
  - Added frontend debugging to track login success and immediate session verification
  - Issue: Users experiencing login loops in deployed environment despite backend session creation
- July 06, 2025. Implemented JWT Authentication System:
  - Replaced problematic session-based authentication with robust JWT token system
  - Added dual token storage: httpOnly cookies + localStorage for maximum compatibility
  - Updated all 40+ protected API routes to use JWT authentication middleware
  - Verified backend authentication flow working correctly with comprehensive testing
  - JWT tokens successfully generated, stored, and validated with proper user authentication
  - Backend authentication fully functional - login loops should be resolved in production
- July 06, 2025. Enhanced production debugging system:
  - Added comprehensive logging to inspiration board creation process
  - Enhanced JWT authentication middleware with detailed production debugging
  - Implemented environment-specific logging for easier production troubleshooting
  - Added null checks and safety measures to prevent runtime errors in board detail views
  - Board creation now logs complete request flow from authentication to database insertion
  - Added complete JWT token lifecycle logging (generation, verification, transmission)
  - Enhanced frontend authentication debugging with token tracking in localStorage
  - Implemented comprehensive error tracking for production deployment diagnostics
- July 06, 2025. CRITICAL FIX: Resolved production authentication failure:
  - Root cause: JWT_SECRET environment variable missing in production deployment
  - Solution: Enhanced JWT authentication to fallback to SESSION_SECRET when JWT_SECRET unavailable
  - Added comprehensive environment variable checking and health endpoints
  - Implemented forced deployment versioning to overcome production caching issues
  - Production health check now confirms: hasEffectiveJwtSecret: true, jwtSecretSource: "SESSION_SECRET"
  - Enhanced login process debugging with detailed authentication flow logging
  - Backend authentication system now fully operational in production environment
- July 08, 2025. Enhanced Mobile-Friendly Image Management:
  - Redesigned image cards to display notes and reference URL fields directly beneath each image
  - Added "Notes" textarea and "Reference URL" input fields with clear labels
  - Implemented always-visible sections with light gray background for better UX
  - Added proper debouncing for auto-save functionality to prevent excessive API calls
  - Updated database schema to include notes and referenceUrl fields for image metadata
  - Created responsive grid layout: 1 column (mobile) → 2 columns (small) → 3-4 columns (desktop)
  - Enhanced user experience with visual feedback during save operations
- July 08, 2025. Complete Image Upload System Implementation:
  - Fixed runtime error: resolved undefined `handleDragDrop` function reference
  - Implemented comprehensive file upload system with drag-and-drop support
  - Added file validation for PNG, JPG, GIF formats with 10MB size limit
  - Streamlined upload modal with single drag-and-drop area (removed duplicate upload sections)
  - Enhanced user experience with "Drag and drop or click to upload a photo" functionality
  - Base64 image data storage working correctly with existing database schema
  - Upload modal now properly closes after successful image addition to board
  - Complete mobile-friendly image management with auto-save notes and reference URLs
- July 08, 2025. Enhanced Navigation for Daily Prioritisation Framework:
  - Added "Daily Prioritisation" card to Streamline Workflow section for improved accessibility
  - Implemented external routing system to handle standalone pages within workflow templates
  - Users can now access Daily Prioritisation Framework from both dashboard Quick Start and Streamline Workflow
  - Updated template handling to support both internal workflow components and external page routes
  - Enhanced user experience with consistent navigation patterns across all workflow tools
- July 09, 2025. Removed Duplicate Daily Prioritisation Card:
  - Cleaned up Streamline Workflow section by removing redundant "Daily Prioritization Framework" template
  - Kept functional "Daily Prioritisation" card (external route to /daily-focus) in top-left position
  - Eliminated confusion from having two similar prioritisation templates
  - Maintained all existing functionality while streamlining the user interface
- July 09, 2025. Built Automation System Toolkit Interactive Section:
  - Created comprehensive standalone automation planning tool at /automation-toolkit
  - Implemented 5 key sections: Prompt Library, Flow Builder, Instagram CTA Copy Helper, Pre-Written Replies Vault, and One-Click Copy Flow
  - Added drag-and-drop flow builder with step reordering, auto-save functionality, and clipboard integration
  - Built pre-written message templates for lead magnets, FAQs, product follow-ups, and welcome sequences
  - Integrated with Streamline Workflow section as external template with proper routing
  - All sections feature mobile-friendly design with auto-save debouncing and copy-to-clipboard functionality
  - Added prominent ManyChat affiliate button at top of page with gradient styling and proper affiliate link tracking
- July 09, 2025. Removed Duplicate "Automate with ManyChat" Card:
  - Cleaned up Streamline Workflow section by removing redundant "Automate with Manychat" template
  - Eliminated duplication as ManyChat functionality is now prominently featured in the Automation System Toolkit
  - Maintained affiliate integration through the featured button in the toolkit rather than separate card
  - Streamlined workflow interface with 4 core templates: Daily Prioritisation, Creative Inspiration Hub, Time Blocking Planner, and Automation System Toolkit
- July 09, 2025. Added Reel & Carousel Template Pack to Content Creation System:
  - Created new external template card linking to Canva with Instagram-style iconography
  - Added "Open in Canva" button with pink-coral gradient styling matching Fizz & Flourish brand
  - Implemented external URL handling with target="_blank" for seamless user experience
  - Updated template counter to reflect 6 total templates in Content Creation System
  - Enhanced template click handler to support both internal pages and external links
- July 09, 2025. Created Reel & Carousel Template Pack Subpage:
  - Built dedicated subpage at /reel-carousel-templates with two internal template cards
  - Added "Editable Reels Template" for short-form video content with Video icon
  - Added "Editable Carousel Template" for swipe-worthy engagement content with Image icon
  - Each template opens Canva in new tab with branded "Open in Canva" button styling
  - Implemented comprehensive template usage tips section with best practices
  - Enhanced navigation with "Back to Content Planning" button and proper routing
- July 09, 2025. Built Monthly Content Planner Interactive Tool:
  - Created comprehensive standalone content planning tool at /monthly-content-planner
  - Implemented editable batching table with 6 columns: Post Idea, Content Pillar, Caption, Visual Type, CTA, Notes
  - Added dynamic monthly calendar view with 4-week grid layout (Monday-Sunday format)
  - Built interactive checklist with 5 planning steps for user progress tracking
  - Integrated folder system setup section with download placeholder button
  - Added color-coded visual type badges (Reel=Pink, Carousel=Orange, Photo=Blue, Graphic=Purple)
  - Implemented content pillar dropdown with 7 predefined categories
  - Added "Top Tip" callout banner with content recycling best practices
  - Connected Monthly Content Calendar template card to new interactive planning tool

## User Preferences

Preferred communication style: Simple, everyday language.