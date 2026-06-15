import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, UsuarioRol } from '../models';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './project.service';

export interface FiltroUsuario {
  rol?: string;
  activo?: boolean;
  busqueda?: string;
  pagina?: number;
  porPagina?: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly url = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  getAll(filtro?: FiltroUsuario): Observable<PaginatedResponse<Usuario>> {
    let params = new HttpParams();
    if (filtro) {
      Object.entries(filtro).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<PaginatedResponse<Usuario>>(this.url, { params });
  }

  getById(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.url}/${id}`);
  }

  create(usuario: Partial<Usuario>): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, usuario);
  }

  update(id: number, usuario: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}`, usuario);
  }

  cambiarEstado(id: number, activo: boolean): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.url}/${id}/estado`, { activo });
  }

  getRoles(usuarioId: number): Observable<UsuarioRol[]> {
    return this.http.get<UsuarioRol[]>(`${this.url}/${usuarioId}/roles`);
  }

  asignarRol(usuarioId: number, rol: UsuarioRol): Observable<UsuarioRol> {
    return this.http.post<UsuarioRol>(`${this.url}/${usuarioId}/roles`, rol);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
