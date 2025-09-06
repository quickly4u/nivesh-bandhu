# Compliance Management Platform - MVP Development Specification

## Product Overview
A web platform that helps Indian startups and private companies manage their statutory compliance requirements. The system automatically determines applicable compliances based on company profile and provides task management, document storage, deadline tracking, and notifications.

## Core Data Models

### Company
```typescript
interface Company {
  id: string;
  name: string;
  cin: string; // Company Identification Number
  pan: string;
  gstin?: string;
  state: string; // Indian state code
  business_type: 'manufacturing' | 'services' | 'trading';
  annual_turnover: number;
  employee_count: number;
  incorporation_date: Date;
  registered_address: Address;
  created_at: Date;
}

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}
```

### User
```typescript
interface User {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'finance_manager' | 'hr_manager' | 'compliance_officer' | 'view_only';
  is_primary: boolean;
  notification_preferences: NotificationPrefs;
  last_login?: Date;
  created_at: Date;
}

interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  in_app: boolean;
  lead_days: number[]; // [7, 3, 1] - days before deadline
}
```

### Compliance
```typescript
interface Compliance {
  id: string;
  company_id: string;
  name: string;
  description: string;
  regulatory_body: 'MCA' | 'CBDT' | 'CBIC' | 'EPFO' | 'ESIC' | 'STATE';
  type: 'tax' | 'corporate' | 'labor' | 'environment';
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
  priority: 'low' | 'medium' | 'high' | 'critical';
  next_due_date: Date;
  last_completed_date?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  is_active: boolean;
}
```

### Task
```typescript
interface Task {
  id: string;
  compliance_id: string;
  title: string;
  description: string;
  due_date: Date;
  assigned_to: string; // user_id
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  checklist: ChecklistItem[];
  notes?: string;
  completed_at?: Date;
  completed_by?: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}
```

### Document
```typescript
interface Document {
  id: string;
  company_id: string;
  compliance_id?: string;
  name: string;
  description?: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: 'certificate' | 'return' | 'register' | 'correspondence' | 'misc';
  is_required: boolean;
  expiry_date?: Date;
  uploaded_by: string;
  uploaded_at: Date;
}
```

### Notification
```typescript
interface Notification {
  id: string;
  user_id: string;
  type: 'deadline_reminder' | 'overdue_alert' | 'task_assigned' | 'completion_reminder';
  title: string;
  message: string;
  compliance_id?: string;
  task_id?: string;
  due_date?: Date;
  is_read: boolean;
  created_at: Date;
}
```

## User Roles & Permissions

### Company Owner/Founder
- Full access to all features
- Can invite/manage users
- Can modify company profile
- Receives all critical notifications

### Finance Manager/Accountant
- Manage tax compliances (GST, TDS, Advance Tax)
- Upload/manage documents
- Complete tasks and add notes
- Receives financial compliance notifications

### HR Manager
- Manage HR compliances (PF, ESI, Professional Tax)
- Upload employee-related documents
- Receives HR compliance notifications

### View-Only User
- Read-only access to dashboard and reports
- Cannot modify data
- Receives summary notifications only

## Key User Stories

### Epic 1: Company Onboarding
**Story**: Company Registration
- User fills multi-step registration form with company details
- System validates CIN, PAN, GSTIN formats
- System auto-generates applicable compliances based on profile
- User completes setup and lands on dashboard

**Story**: Compliance Auto-Generation
- System applies business rules to determine applicable compliances
- Shows user which compliances apply and why
- Creates compliance calendar with appropriate due dates

### Epic 2: Compliance Management
**Story**: Dashboard Overview
- User sees upcoming deadlines (next 30 days)
- Shows overdue items with priority
- Displays completion statistics
- Provides quick action buttons

**Story**: Compliance Details
- User views individual compliance with all tasks
- Can assign tasks to team members
- Upload required documents
- Mark tasks/compliance as complete

### Epic 3: Task Management
**Story**: Task Assignment
- User assigns specific tasks to team members
- Assigned user receives notification
- Task shows due date and checklist items
- Progress tracked against compliance

**Story**: Task Completion
- User marks tasks complete with notes
- System updates compliance progress
- Next occurrence auto-scheduled for recurring items
- Completion notifications sent

### Epic 4: Document Management
**Story**: Document Upload
- User uploads files via drag-and-drop
- System categorizes documents automatically
- Files linked to specific compliances
- Search and filter functionality

## Page Specifications

### 1. Authentication Pages
- **Login Page**: Email/password with forgot password link
- **Registration Wizard**: 4-step company setup process
  - Step 1: Basic company info (name, CIN, PAN, GSTIN)
  - Step 2: Business details (turnover, employees, state, type)
  - Step 3: Primary user setup (name, email, password)
  - Step 4: Review applicable compliances

### 2. Dashboard
- **Stats Cards**: Total compliances, due this week, overdue, completion rate
- **Upcoming Deadlines**: List of next 10 deadlines with countdown
- **Recent Activity**: Latest task completions and updates
- **Quick Actions**: Upload document, add task, view calendar

### 3. Compliance List
- **Table View**: All compliances with filters and search
- **Columns**: Name, regulatory body, frequency, next due, status, progress
- **Filters**: Status, type, regulatory body, assigned user
- **Actions**: View details, mark complete, assign tasks

### 4. Compliance Detail
- **Header**: Compliance name, description, next due date, status
- **Tasks Section**: Checklist of required tasks with assignments
- **Documents Section**: Required and uploaded documents
- **History Section**: Past completion dates and notes

### 5. Calendar View
- **Monthly Calendar**: Shows all compliance deadlines
- **Color Coding**: Red (overdue), orange (due soon), green (completed)
- **Filters**: By type, regulatory body, assigned user
- **Event Details**: Click to view compliance details

### 6. Document Library
- **Grid/List View**: All documents with thumbnails
- **Categories**: Organized by compliance type and category
- **Search**: By name, category, date, compliance
- **Upload**: Drag-and-drop with progress indicator

### 7. Notifications
- **List View**: All notifications with read/unread status
- **Types**: Deadline reminders, task assignments, overdue alerts
- **Settings**: Configure notification preferences and channels

### 8. Company Profile
- **Basic Info**: Editable company details
- **Applicable Compliances**: Auto-generated list with explanations
- **Team Management**: Add/remove users, assign roles

## Business Rules for Compliance Applicability

### Tax Compliances
- **GST Monthly**: If annual_turnover > ₹1.5 Cr
- **GST Quarterly**: If annual_turnover ≤ ₹1.5 Cr
- **TDS Monthly**: If company deducts tax on payments
- **Advance Tax**: If estimated annual tax > ₹10,000

### Labor Compliances
- **PF Monthly**: If employee_count ≥ 10
- **ESI Monthly**: If employee_count ≥ 10
- **Professional Tax**: If state in ['MH', 'KA', 'TN', 'WB', 'AS', 'MP', 'GJ']

### Corporate Compliances
- **Annual Return (MGT-7)**: All private companies
- **Financial Statements (AOC-4)**: All private companies
- **Board Meetings**: Minimum 4 per year, max 120 days gap
- **Director KYC**: All directors annually

### Frequency Rules
- Monthly: Due by specific dates (7th, 11th, 15th, 20th of following month)
- Quarterly: Due 15-30 days after quarter end
- Annual: Due 6-10 months after financial year end

## UI/UX Guidelines

### Design System
- **Colors**: Primary blue (#1976d2), success green (#4caf50), warning orange (#ff9800), error red (#d32f2f)
- **Typography**: Material-UI default font stack
- **Components**: Use Material-UI components consistently
- **Responsive**: Mobile-first design with breakpoints

### Key Interactions
- **Notifications**: Toast messages for actions, persistent for errors
- **Loading States**: Skeleton loaders for data fetching
- **Confirmations**: Modal dialogs for destructive actions
- **Forms**: Real-time validation with clear error messages

## MVP Feature List

### Core Features (Must Have)
✅ Company registration with multi-step wizard
✅ Auto-generation of applicable compliances
✅ Dashboard with key metrics and upcoming deadlines
✅ Compliance list with filtering and search
✅ Individual compliance detail pages with tasks
✅ Task assignment and completion tracking
✅ Document upload and organization
✅ Calendar view of all deadlines
✅ Email notifications for deadlines
✅ User management with role-based access

### Enhanced Features (Nice to Have)
⏳ WhatsApp/SMS notifications
⏳ Mobile-responsive design optimization
⏳ Bulk document upload
⏳ Advanced reporting and analytics
⏳ Integration with government portals
⏳ Compliance templates library

## Technical Requirements

### Frontend
- React 18 with TypeScript
- Material-UI for components
- React Router for navigation
- React Query for state management
- React Hook Form for forms
- Date-fns for date handling

### Backend
- Node.js with Express
- MongoDB for data storage
- JWT for authentication
- Multer for file uploads
- Node-cron for scheduled tasks
- Nodemailer for email notifications

### Key Features to Implement
1. **Authentication System**: JWT-based with role-based access control
2. **File Upload**: Support for PDF, DOC, XLS files up to 10MB
3. **Notification System**: Email notifications with customizable preferences
4. **Search & Filtering**: Real-time search across compliances and documents
5. **Data Validation**: Comprehensive validation for Indian business data formats
6. **Responsive Design**: Works well on desktop, tablet, and mobile devices

## Success Metrics
- User completes company registration: 90%
- User uploads first document: 70%
- User completes first compliance task: 60%
- User returns within 7 days: 80%
- Average time to complete onboarding: <10 minutes

This specification provides all the essential requirements for building a comprehensive compliance management platform optimized for Indian startups and private companies.