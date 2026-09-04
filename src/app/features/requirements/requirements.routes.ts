import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Rol } from '../../core/models';

export const REQUIREMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./requirement-list/requirement-list.component').then(m => m.RequirementListComponent)
  },
  {
    path: 'nuevo',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD])],
    loadComponent: () => import('./requirement-form/requirement-form.component').then(m => m.RequirementFormComponent)
  },
  {
    path: ':id/editar',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD])],
    loadComponent: () => import('./requirement-form/requirement-form.component').then(m => m.RequirementFormComponent)
  }
];
