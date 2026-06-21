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

    if (usuario.rol === Rol.ADMIN) return true;

    if (rolesPermitidos.includes(usuario.rol)) return true;

    if (usuario.rol === Rol.DEVELOPER) router.navigate(['/defectos']);
    else router.navigate(['/proyectos']);
    return false;
  };
};
