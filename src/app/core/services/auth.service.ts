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

  usuarioActual = signal<Usuario | null>(this.getUserFromStorage());

  readonly esAdmin          = computed(() => this.usuarioActual()?.rol === Rol.ADMIN);
  readonly esDesarrollador  = computed(() => this.usuarioActual()?.rol === Rol.DEVELOPER);
  readonly esTester         = computed(() => this.usuarioActual()?.rol === Rol.QA_TESTER);
  readonly esQaLead         = computed(() => this.usuarioActual()?.rol === Rol.QA_LEAD);
  readonly esProjectManager = computed(() => this.usuarioActual()?.rol === Rol.PROJECT_MANAGER);

  // Puede crear/editar/eliminar proyectos, requerimientos, casos y ciclos
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
    return rol === Rol.ADMIN || rol === Rol.QA_LEAD || rol === Rol.QA_TESTER || rol === Rol.PROJECT_MANAGER;
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
    return !!this.getToken();
  }

  private getUserFromStorage(): Usuario | null {
    const data = localStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  }
}
