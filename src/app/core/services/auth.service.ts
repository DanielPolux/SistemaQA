import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, Rol, Usuario } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'qa_token';
  private readonly USER_KEY = 'qa_user';

  usuarioActual = signal<Usuario | null>(this.getValidUserFromStorage());

  readonly esAdmin          = computed(() => this.usuarioActual()?.rol === Rol.ADMIN);
  readonly esDesarrollador  = computed(() => this.usuarioActual()?.rol === Rol.DEVELOPER);
  readonly esTester         = computed(() => this.usuarioActual()?.rol === Rol.QA_TESTER);
  readonly esQaLead         = computed(() => this.usuarioActual()?.rol === Rol.QA_LEAD);
  readonly esProjectManager = computed(() => this.usuarioActual()?.rol === Rol.PROJECT_MANAGER);

  // La gestión de proyectos corresponde al equipo que gobierna QA.
  readonly puedeGestionarProyectos = computed(() => {
    const rol = this.usuarioActual()?.rol;
    return rol === Rol.ADMIN || rol === Rol.QA_LEAD;
  });

  // El borrado de un proyecto es una operación administrativa excepcional.
  readonly puedeEliminarProyectos = computed(() => this.usuarioActual()?.rol === Rol.ADMIN);

  readonly puedeGestionarRequerimientos = computed(() => {
    const rol = this.usuarioActual()?.rol;
    return rol === Rol.ADMIN || rol === Rol.QA_LEAD;
  });

  readonly puedeGestionarPlanes = computed(() => {
    const rol = this.usuarioActual()?.rol;
    return rol === Rol.ADMIN || rol === Rol.QA_LEAD;
  });

  readonly puedeGestionarCiclos = computed(() => {
    const rol = this.usuarioActual()?.rol;
    return rol === Rol.ADMIN || rol === Rol.QA_LEAD;
  });

  // Permiso QA general usado por casos, requerimientos y ciclos.
  readonly puedeEditar = computed(() => {
    const rol = this.usuarioActual()?.rol;
    return rol === Rol.ADMIN || rol === Rol.QA_LEAD || rol === Rol.QA_TESTER;
  });

  readonly puedeVerReportes = computed(() => {
    const rol = this.usuarioActual()?.rol;
    return rol === Rol.ADMIN || rol === Rol.QA_LEAD || rol === Rol.QA_TESTER || rol === Rol.PROJECT_MANAGER;
  });

  // Puede registrar/ejecutar ciclos de prueba
  readonly puedeEjecutar = computed(() => {
    const rol = this.usuarioActual()?.rol;
    return rol === Rol.ADMIN || rol === Rol.QA_LEAD || rol === Rol.QA_TESTER;
  });

  // Puede editar defectos: QA para gestión, PM solo para asignar desarrollador
  readonly puedeEditarDefecto = computed(() => {
    const rol = this.usuarioActual()?.rol;
    return rol === Rol.ADMIN || rol === Rol.QA_LEAD || rol === Rol.QA_TESTER;
  });

  // Solo Admin y QA Lead pueden eliminar defectos
  readonly puedeEliminarDefecto = computed(() => {
    const rol = this.usuarioActual()?.rol;
    return rol === Rol.ADMIN || rol === Rol.QA_LEAD;
  });

  // Solo Developer (y Admin) actualiza estado de desarrollo
  readonly puedeGestionarDesarrollo = computed(() => {
    const rol = this.usuarioActual()?.rol;
    return rol === Rol.ADMIN || rol === Rol.DEVELOPER;
  });

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.usuario));
        this.usuarioActual.set(response.usuario);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.usuarioActual.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      // Estado inconsistente (p.ej. quedó el usuario en storage sin token):
      // limpiar para que el layout autenticado no se muestre sin sesión válida.
      if (localStorage.getItem(this.USER_KEY)) {
        localStorage.removeItem(this.USER_KEY);
        this.usuarioActual.set(null);
      }
      return false;
    }

    if (!this.esTokenVigente(token)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      this.usuarioActual.set(null);
      return false;
    }
    return true;
  }

  // Verifica localmente la expiración del JWT (sin efectos secundarios).
  private esTokenVigente(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 >= Date.now();
    } catch {
      return false;
    }
  }

  private getUserFromStorage(): Usuario | null {
    const data = localStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  // Usado solo en la inicialización del signal: si el token cacheado ya
  // expiró (p.ej. sesión de un día anterior), no debe darse por autenticado
  // ni mostrarse cabecera/sidebar hasta un login válido.
  private getValidUserFromStorage(): Usuario | null {
    const token = this.getToken();
    if (!token || !this.esTokenVigente(token)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
    return this.getUserFromStorage();
  }
}
