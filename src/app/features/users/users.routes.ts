import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Rol } from '../../core/models';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-list/user-list.component').then(m => m.UserListComponent),
    canActivate: [roleGuard([Rol.ADMIN])]
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./user-form/user-form.component').then(m => m.UserFormComponent),
    canActivate: [roleGuard([Rol.ADMIN])]
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./user-form/user-form.component').then(m => m.UserFormComponent),
    canActivate: [roleGuard([Rol.ADMIN])]
  }
];
