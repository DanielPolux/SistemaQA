import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Rol } from '../../core/models';

export const DEFECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./defect-list/defect-list.component').then(m => m.DefectListComponent)
  },
  {
    path: 'nuevo',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER])],
    loadComponent: () => import('./defect-form/defect-form.component').then(m => m.DefectFormComponent)
  },
  {
    path: ':id/editar',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER, Rol.DEVELOPER])],
    loadComponent: () => import('./defect-form/defect-form.component').then(m => m.DefectFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./defect-detail/defect-detail.component').then(m => m.DefectDetailComponent)
  }
];
