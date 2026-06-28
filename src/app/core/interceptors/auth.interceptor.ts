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
        if (auth.isAuthenticated()) {
          auth.logout();
        }
        return EMPTY;
      }
      return throwError(() => err);
    })
  );
};
