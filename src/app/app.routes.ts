import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Rol } from './core/models';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'sin-permiso', redirectTo: '/defectos', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
  },
  {
    path: 'proyectos',
    canActivate: [authGuard, roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER, Rol.PROJECT_MANAGER])],
    loadChildren: () => import('./features/projects/projects.routes').then(m => m.PROJECTS_ROUTES)
  },
  {
    path: 'requerimientos',
    canActivate: [authGuard, roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER, Rol.PROJECT_MANAGER])],
    loadChildren: () => import('./features/requirements/requirements.routes').then(m => m.REQUIREMENTS_ROUTES)
  },
  {
    path: 'casos-prueba',
    canActivate: [authGuard, roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER, Rol.PROJECT_MANAGER])],
    loadChildren: () => import('./features/test-cases/test-cases.routes').then(m => m.TEST_CASES_ROUTES)
  },
  {
    path: 'planes-prueba',
    canActivate: [authGuard, roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER, Rol.PROJECT_MANAGER])],
    loadChildren: () => import('./features/planes-prueba/planes-prueba.routes').then(m => m.PLANES_PRUEBA_ROUTES)
  },
  {
    path: 'ciclos',
    canActivate: [authGuard, roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER, Rol.PROJECT_MANAGER])],
    loadChildren: () => import('./features/ciclos/ciclos.routes').then(m => m.CICLOS_ROUTES)
  },
  {
    path: 'ejecuciones',
    canActivate: [authGuard, roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER, Rol.PROJECT_MANAGER])],
    loadChildren: () => import('./features/ejecuciones/ejecuciones.routes').then(m => m.EJECUCIONES_ROUTES)
  },
  {
    path: 'defectos',
    canActivate: [authGuard],
    loadChildren: () => import('./features/defects/defects.routes').then(m => m.DEFECTS_ROUTES)
  },
  {
    path: 'usuarios',
    canActivate: [authGuard, roleGuard([Rol.ADMIN])],
    loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES)
  },
  {
    path: 'catalogos',
    canActivate: [authGuard, roleGuard([Rol.ADMIN])],
    loadChildren: () => import('./features/catalogos/catalogos.routes').then(m => m.CATALOGOS_ROUTES)
  },
  {
    path: 'reportes',
    canActivate: [authGuard, roleGuard([Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER, Rol.PROJECT_MANAGER])],
    loadChildren: () => import('./features/reportes/reportes.routes').then(m => m.REPORTES_ROUTES)
  },
  { path: '**', redirectTo: '/dashboard' }
];
