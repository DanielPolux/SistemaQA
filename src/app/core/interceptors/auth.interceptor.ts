import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { EMPTY, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        // Sesión expirada o token inválido — redirigir sin propagar el error
        // para evitar toasts de error durante el proceso de logout.
        // Siempre se limpia y redirige: isAuthenticated() ya deja la sesión
        // en null como efecto secundario cuando el token expiró, así que
        // condicionar el logout a su resultado nunca disparaba la redirección.
        auth.logout();
        return EMPTY;
      }
      return throwError(() => err);
    })
  );
};
