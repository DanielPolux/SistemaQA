import { Routes } from '@angular/router';

export const EJECUCIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ejecucion-list/ejecucion-list.component').then(m => m.EjecucionListComponent)
  }
];
