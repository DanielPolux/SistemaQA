import { Routes } from '@angular/router';

export const DEFECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./defect-list/defect-list.component').then(m => m.DefectListComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./defect-form/defect-form.component').then(m => m.DefectFormComponent)
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./defect-form/defect-form.component').then(m => m.DefectFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./defect-detail/defect-detail.component').then(m => m.DefectDetailComponent)
  }
];
