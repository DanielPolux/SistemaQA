import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Rol } from '../../core/models';

export const CICLOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ciclo-list/ciclo-list.component').then(m => m.CicloListComponent),
  },
  {
    path: 'nuevo',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD])],
    loadComponent: () => import('./ciclo-form/ciclo-form.component').then(m => m.CicloFormComponent),
  },
  {
    path: ':id/editar',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD])],
    loadComponent: () => import('./ciclo-form/ciclo-form.component').then(m => m.CicloFormComponent),
  },
  {
    path: ':id/ejecutar',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER])],
    loadComponent: () => import('./ciclo-ejecucion/ciclo-ejecucion.component').then(m => m.CicloEjecucionComponent),
  },
];
