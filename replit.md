# Overview

This is a comprehensive Fire Safety Management System (소방점검관리 시스템) built as a full-stack web application. The system manages fire safety inspections, equipment tracking, building management, compliance monitoring, and reporting for fire safety professionals. It features a modern React frontend with a Node.js/Express backend, PostgreSQL database with Drizzle ORM, and includes authentication, role-based access control, and PDF report generation capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Context-based auth provider with protected routes

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy using session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Password Security**: Node.js crypto module with scrypt for password hashing
- **API Design**: RESTful endpoints with JSON responses
- **Error Handling**: Centralized error handling middleware

## Data Layer
- **Database**: PostgreSQL with Neon Database as the provider
- **ORM**: Drizzle ORM with TypeScript-first schema definitions
- **Schema Structure**:
  - Users table with role-based access (inspector, manager, admin)
  - Buildings table for property management
  - Equipment table for fire safety equipment tracking
  - Inspections table for inspection scheduling and records
  - InspectionItems table for detailed inspection findings
  - ComplianceRules table for regulatory compliance tracking
- **Migrations**: Drizzle Kit for database schema migrations

## Security Architecture
- **Authentication**: Session-based with secure password hashing
- **Authorization**: Role-based access control (RBAC)
- **Session Management**: Secure HTTP-only cookies with PostgreSQL storage
- **Password Policy**: Strong password requirements with salt-based hashing

## PDF Generation
- **Engine**: Puppeteer for server-side PDF generation
- **Reports**: Inspection reports and compliance reports with Korean language support
- **Templates**: HTML-based templates with embedded CSS for professional formatting

## Development Tools
- **Build System**: Vite with hot module replacement
- **Type Safety**: Full TypeScript coverage across frontend and backend
- **Code Quality**: ESLint and TypeScript compiler for code validation
- **Development Experience**: Replit-specific plugins for enhanced development workflow

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Connection**: WebSocket-based connections for serverless environments

## UI and Styling
- **Radix UI**: Headless UI components for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Web fonts including Noto Sans KR for Korean text support

## Development and Build Tools
- **Vite**: Fast build tool and development server
- **Replit Plugins**: Development environment enhancements including runtime error overlay, cartographer, and dev banner
- **PostCSS**: CSS processing with Tailwind CSS integration

## Server-side Libraries
- **Express Session**: Session management middleware
- **PDF Generation**: Puppeteer for creating professional reports
- **Date Handling**: date-fns for date manipulation and formatting
- **Validation**: Zod for runtime type validation and schema validation

## Authentication and Security
- **Passport.js**: Authentication middleware with local strategy
- **Node.js Crypto**: Built-in cryptographic functions for password security
- **Session Store**: PostgreSQL-backed session persistence