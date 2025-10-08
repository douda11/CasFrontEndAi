import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ProjectFormComponent } from './components/project-form/project-form.component';
import { CompareComponent } from './components/compare/compare.component';
import { ComparisonHistoryComponent } from './components/comparison-history/comparison-history.component';
import { HubspotCallbackComponent } from './components/hubspot-callback/hubspot-callback.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { NoAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
  // Public routes (no authentication required)
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [NoAuthGuard]
  },
  { 
    path: 'hubspot-callback', 
    component: HubspotCallbackComponent 
  },
  
  // Protected routes (authentication required)
  { 
    path: 'project', 
    component: ProjectFormComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'compare', 
    component: CompareComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'historique', 
    component: ComparisonHistoryComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'tarif-utwin', 
    component: ProjectFormComponent,
    canActivate: [AuthGuard]
  },
  
  // Admin routes (admin authentication required)
  { 
    path: 'admin/users', 
    component: UserManagementComponent,
    canActivate: [AdminGuard]
  },
  
  // Default redirects
  { 
    path: '', 
    redirectTo: '/compare', 
    pathMatch: 'full' 
  },
  { 
    path: '**', 
    redirectTo: '/compare' 
  }
]
