import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./project-list/project-list.component').then(m => m.ProjectListComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./project-form/project-form.component').then(m => m.ProjectFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./project-detail/project-detail.component').then(m => m.ProjectDetailComponent)
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./project-form/project-form.component').then(m => m.ProjectFormComponent)
  }
];
