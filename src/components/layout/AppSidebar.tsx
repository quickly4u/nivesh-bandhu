import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck,
  Calendar,
  FolderOpen,
  Bell,
  Building,
  Users,
  BarChart3,
  Shield,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and metrics',
  },
  {
    title: 'Compliances',
    url: '/compliances',
    icon: Shield,
    description: 'Manage compliance requirements',
  },
  {
    title: 'Tasks',
    url: '/tasks',
    icon: FileCheck,
    description: 'Track and complete tasks',
  },
  {
    title: 'Calendar',
    url: '/calendar',
    icon: Calendar,
    description: 'View upcoming deadlines',
  },
  {
    title: 'Documents',
    url: '/documents',
    icon: FolderOpen,
    description: 'Document library',
  },
  {
    title: 'Notifications',
    url: '/notifications',
    icon: Bell,
    description: 'Alerts and reminders',
  },
];

const managementItems = [
  {
    title: 'Company',
    url: '/company',
    icon: Building,
    description: 'Company profile and settings',
  },
  {
    title: 'Team',
    url: '/team',
    icon: Users,
    description: 'Manage team members',
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: BarChart3,
    description: 'Analytics and reports',
  },
];

export const AppSidebar: React.FC = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={cn(collapsed ? "w-14" : "w-60")} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold">ComplianceHub</h2>
              <p className="text-xs text-muted-foreground">Startup Compliance</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <div className="flex-1">
                          <div>{item.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <div className="flex-1">
                          <div>{item.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};