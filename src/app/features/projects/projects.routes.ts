import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Rol } from '../../core/models';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./project-list/project-list.component').then(m => m.ProjectListComponent)
  },
  {
    path: 'nuevo',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD])],
    loadComponent: () => import('./project-form/project-form.component').then(m => m.ProjectFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./project-detail/project-detail.component').then(m => m.ProjectDetailComponent)
  },
  {
    path: ':id/editar',
    canActivate: [roleGuard([Rol.ADMIN, Rol.QA_LEAD])],
    loadComponent: () => import('./project-form/project-form.component').then(m => m.ProjectFormComponent)
  }
];
