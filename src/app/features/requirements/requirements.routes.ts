import { Routes } from '@angular/router';

export const REQUIREMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./requirement-list/requirement-list.component').then(m => m.RequirementListComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./requirement-form/requirement-form.component').then(m => m.RequirementFormComponent)
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./requirement-form/requirement-form.component').then(m => m.RequirementFormComponent)
  }
];
