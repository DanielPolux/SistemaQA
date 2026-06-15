import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ComentarioDefecto, Defecto, EstadoDesarrollo } from '../models';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './project.service';

export interface FiltroDefecto {
  proyectoId?: number;
  casoPruebaId?: number;
  estado?: string;
  severidad?: string;
  prioridad?: string;
  asignadoA?: number;
  busqueda?: string;
  pagina?: number;
  porPagina?: number;
}

@Injectable({ providedIn: 'root' })
export class DefectService {
  private readonly url = `${environment.apiUrl}/defectos`;

  constructor(private http: HttpClient) {}

  getAll(filtro?: FiltroDefecto): Observable<PaginatedResponse<Defecto>> {
    let params = new HttpParams();
    if (filtro) {
      Object.entries(filtro).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<PaginatedResponse<Defecto>>(this.url, { params });
  }

  getById(id: number): Observable<Defecto> {
    return this.http.get<Defecto>(`${this.url}/${id}`);
  }

  getByCasoPrueba(casoPruebaId: number): Observable<Defecto[]> {
    return this.http.get<Defecto[]>(`${environment.apiUrl}/casos-prueba/${casoPruebaId}/defectos`);
  }

  create(defecto: Partial<Defecto>): Observable<Defecto> {
    return this.http.post<Defecto>(this.url, defecto);
  }

  update(id: number, defecto: Partial<Defecto>): Observable<Defecto> {
    return this.http.put<Defecto>(`${this.url}/${id}`, defecto);
  }

  cambiarEstado(id: number, estado: string, comentario?: string): Observable<Defecto> {
    return this.http.patch<Defecto>(`${this.url}/${id}/estado`, { estado, comentario });
  }

  agregarComentario(defectoId: number, comentario: string): Observable<ComentarioDefecto> {
    return this.http.post<ComentarioDefecto>(`${this.url}/${defectoId}/comentarios`, { comentario });
  }

  actualizarEstadoDesarrollo(id: number, estadoDesarrollo: EstadoDesarrollo): Observable<Defecto> {
    return this.http.patch<Defecto>(`${this.url}/${id}/estado-desarrollo`, { estadoDesarrollo });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
