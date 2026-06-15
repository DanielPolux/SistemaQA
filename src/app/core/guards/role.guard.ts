import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Rol } from '../models';

export const roleGuard = (rolesPermitidos: Rol[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const usuario = auth.usuarioActual();

    if (!usuario) {
      router.navigate(['/auth/login']);
      return false;
    }

    if (rolesPermitidos.includes(usuario.rol)) return true;

    router.navigate(['/sin-permiso']);
    return false;
  };
};
