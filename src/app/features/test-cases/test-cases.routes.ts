import { Routes } from '@angular/router';

export const TEST_CASES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./test-case-list/test-case-list.component').then(m => m.TestCaseListComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./test-case-form/test-case-form.component').then(m => m.TestCaseFormComponent)
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./test-case-form/test-case-form.component').then(m => m.TestCaseFormComponent)
  }
];
