# LightStory v0 - Enterprise Story Management System

LightStory is a high-performance, secure, and minimalist web application designed for reading and managing digital stories. Built with a **Clean Architecture** approach, it features a dual-portal system for readers and administrators, powered by **React (Vite)**, **Supabase**, and **Tailwind CSS**.

## 🚀 Key Features

### 📖 Client Portal (Reader Experience)
- **Minimalist Reader**: A distraction-free reading interface optimized for long-form content.
- **Optimistic Interactions**: Instant feedback for views and likes using React Query.
- **FOUC-Proof Dark Mode**: Seamless theme switching without initial white flashes.
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop devices.

### 🛡️ Admin Portal (Management System)
- **Role-Based Access Control (RBAC)**: Granular permissions for `superadmin`, `admin`, and `employee`.
- **Dedicated Story Creation**: New tab-based story creation flow to prevent data loss.
- **Story & Chapter CRUD**: Professional management tools with Supabase integration.
- **Ad Management**: Dynamic ad script injection via a secure renderer.
- **User Management**: (SuperAdmin only) Advanced role control and user auditing.
- **Accessibility**: High-contrast typography and polished dark mode implementation.

### 🔐 Authentication
- **Multi-channel Login**: Supports Google OAuth, Email Magic Link, and traditional Email/Password.
- **Secure Sessions**: Persistent auth states with automatic profile synchronization.

## 🏗️ Technical Architecture

- **Frontend**: React 18+ with Vite for ultra-fast builds.
- **Styling**: Tailwind CSS for utility-first, responsive design.
- **Backend-as-a-Service**: Supabase (PostgreSQL, Auth, Storage).
- **Security**: Zero-Trust Row Level Security (RLS) policies enforced at the database level.
- **State Management**: React Context for Auth/Theme and TanStack Query for server state.
- **Performance**: Code-splitting (Lazy Loading) and atomic RPC functions for data integrity.

## 📁 Project Structure

```text
/src
  /core          # Supabase config, shared types, and constants
  /shared        # Reusable UI components and route guards
  /modules
    /auth        # RBAC logic and Authentication context
    /theme       # FOUC-proof theme management
    /client      # User-facing pages (Home, Reader)
    /admin       # Dashboard and management modules
  /hooks         # Custom hooks with optimistic update logic
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Project

### Installation

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```
4. **Database Setup**:
   Execute the contents of `database.sql.example` in your Supabase SQL Editor to set up tables, enums, and RLS policies.
5. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🔒 Security Audit

This project has undergone a rigorous security audit. Key protections include:
- **Zero-Trust RLS**: No data can be accessed or modified without explicit database-level permission.
- **Atomic Operations**: View counts and interactions use PostgreSQL functions to prevent race conditions.
- **Role Integrity**: Users cannot escalate their own privileges via frontend or API manipulation.

## 📄 License

This project is licensed under the Apache-2.0 License.
