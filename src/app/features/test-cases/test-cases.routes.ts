import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Rol } from '../../core/models';

export const TEST_CASES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./test-case-list/test-case-list.component').then(m => m.TestCaseListComponent)
  },
  {
    path: 'importar',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER])],
    loadComponent: () => import('./test-case-import/test-case-import.component').then(m => m.TestCaseImportComponent)
  },
  {
    path: 'nuevo',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER])],
    loadComponent: () => import('./test-case-form/test-case-form.component').then(m => m.TestCaseFormComponent)
  },
  {
    path: ':id/ver',
    loadComponent: () => import('./test-case-form/test-case-form.component').then(m => m.TestCaseFormComponent)
  },
  {
    path: ':id/editar',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER])],
    loadComponent: () => import('./test-case-form/test-case-form.component').then(m => m.TestCaseFormComponent)
  }
];
