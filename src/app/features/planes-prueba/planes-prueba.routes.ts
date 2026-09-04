import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Rol } from '../../core/models';

export const PLANES_PRUEBA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./plan-list/plan-list.component').then(m => m.PlanListComponent),
  },
  {
    path: 'nuevo',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD])],
    loadComponent: () =>
      import('./plan-form/plan-form.component').then(m => m.PlanFormComponent),
  },
  {
    path: ':id/trazabilidad',
    loadComponent: () =>
      import('./trazabilidad/trazabilidad.component').then(m => m.TrazabilidadComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./plan-detail/plan-detail.component').then(m => m.PlanDetailComponent),
  },
  {
    path: ':id/editar',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD])],
    loadComponent: () =>
      import('./plan-form/plan-form.component').then(m => m.PlanFormComponent),
  },
];
