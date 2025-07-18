import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ProjectFormComponent } from './components/project-form/project-form.component';
import { CompareComponent } from './components/compare/compare.component';

export const routes: Routes = [
  {path: 'login', component: LoginComponent},
  {path: 'project', component: ProjectFormComponent},
  {path: 'compare', component: CompareComponent},
  {path: 'tarif-utwin', component: ProjectFormComponent},
]
