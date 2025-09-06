// Core Application Types for Compliance Management Platform

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Company {
  id: string;
  name: string;
  cin: string;
  pan: string;
  gstin?: string;
  state: string;
  business_type: 'manufacturing' | 'services' | 'trading';
  annual_turnover: number;
  employee_count: number;
  incorporation_date: string;
  registered_address: Address;
  created_at: string;
  updated_at: string;
}

export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  in_app: boolean;
  lead_days: number[];
}

export interface Profile {
  id: string;
  company_id?: string;
  name: string;
  phone?: string;
  role: 'owner' | 'finance_manager' | 'hr_manager' | 'compliance_officer' | 'view_only';
  is_primary: boolean;
  notification_preferences: NotificationPrefs;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Compliance {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  regulatory_body: 'MCA' | 'CBDT' | 'CBIC' | 'EPFO' | 'ESIC' | 'STATE';
  type: 'tax' | 'corporate' | 'labor' | 'environment';
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
  priority: 'low' | 'medium' | 'high' | 'critical';
  next_due_date: string;
  last_completed_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  compliance_id: string;
  title: string;
  description?: string;
  due_date: string;
  assigned_to?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  checklist: ChecklistItem[];
  notes?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
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
  expiry_date?: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'deadline_reminder' | 'overdue_alert' | 'task_assigned' | 'completion_reminder';
  title: string;
  message: string;
  compliance_id?: string;
  task_id?: string;
  due_date?: string;
  is_read: boolean;
  created_at: string;
}

export interface CompanyStats {
  total_compliances: number;
  due_this_week: number;
  overdue: number;
  completion_rate: number;
  upcoming_deadlines: Compliance[];
}

export interface DashboardData {
  stats: CompanyStats;
  recent_tasks: Task[];
  notifications: Notification[];
}

// Indian states for dropdown
export const INDIAN_STATES = [
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CG', name: 'Chhattisgarh' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OR', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UT', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'DN', name: 'Dadra and Nagar Haveli' },
  { code: 'DD', name: 'Daman and Diu' },
  { code: 'DL', name: 'Delhi' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'PY', name: 'Puducherry' },
] as const;

export type IndianState = typeof INDIAN_STATES[number]['code'];