import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ProjectFormComponent } from './components/project-form/project-form.component';
import { CompareComponent } from './components/compare/compare.component';

export const routes: Routes = [
  {path: 'login', component: LoginComponent},
  {path: 'project', component: ProjectFormComponent},
  {path: 'compare', component: CompareComponent},

  {
    path: 'tarif-utwin',
    loadComponent: () => import('./components/modules/tarif-utwin/tarif-utwin.component')
      .then(m => m.TarifUtwinComponent)
  },
  {
    path: 'tarif-april',
    loadComponent: () => import('./components/modules/tarif-april/tarif-april.component')
      .then(m => m.TarifAprilComponent)
  },
  {
    path: 'tarif-comparison',
    loadComponent: () => import('./components/modules/tarif-comparison/tarif-comparison.component')
      .then(m => m.TarifComparisonComponent)
  }
];
