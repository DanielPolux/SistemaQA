import { Routes } from '@angular/router';

export const CICLOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ciclo-list/ciclo-list.component').then(m => m.CicloListComponent),
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./ciclo-form/ciclo-form.component').then(m => m.CicloFormComponent),
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./ciclo-form/ciclo-form.component').then(m => m.CicloFormComponent),
  },
  {
    path: ':id/ejecutar',
    loadComponent: () => import('./ciclo-ejecucion/ciclo-ejecucion.component').then(m => m.CicloEjecucionComponent),
  },
];
