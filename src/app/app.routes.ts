import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Rol } from './core/models';

export const routes: Routes = [
  { path: '', redirectTo: '/proyectos', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'proyectos',
    canActivate: [authGuard],
    loadChildren: () => import('./features/projects/projects.routes').then(m => m.PROJECTS_ROUTES)
  },
  {
    path: 'requerimientos',
    canActivate: [authGuard],
    loadChildren: () => import('./features/requirements/requirements.routes').then(m => m.REQUIREMENTS_ROUTES)
  },
  {
    path: 'casos-prueba',
    canActivate: [authGuard],
    loadChildren: () => import('./features/test-cases/test-cases.routes').then(m => m.TEST_CASES_ROUTES)
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
  { path: '**', redirectTo: '/proyectos' }
];
