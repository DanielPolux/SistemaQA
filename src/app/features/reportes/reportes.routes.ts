import { Routes } from '@angular/router';

export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./reporte-proyecto/reporte-proyecto.component').then(m => m.ReporteProyectoComponent),
  },
];
