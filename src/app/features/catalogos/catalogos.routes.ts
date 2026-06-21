import { Routes } from '@angular/router';

export const CATALOGOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./catalogos-list.component').then(m => m.CatalogosListComponent),
  },
];
