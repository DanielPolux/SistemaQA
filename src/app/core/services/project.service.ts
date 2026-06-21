import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proyecto, ProyectoResumen } from '../models';
import { environment } from '../../../environments/environment';

export interface FiltroProyecto {
  estado?: string;
  responsableId?: number;
  busqueda?: string;
  pagina?: number;
  porPagina?: number;
}

export interface PaginatedResponse<T> {
  datos: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly url = `${environment.apiUrl}/proyectos`;

  constructor(private http: HttpClient) {}

  getAll(filtro?: FiltroProyecto): Observable<PaginatedResponse<Proyecto>> {
    let params = new HttpParams();
    if (filtro) {
      Object.entries(filtro).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<PaginatedResponse<Proyecto>>(this.url, { params });
  }

  getById(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(`${this.url}/${id}`);
  }

  getResumen(id: number): Observable<ProyectoResumen> {
    return this.http.get<ProyectoResumen>(`${this.url}/${id}/resumen`);
  }

  create(proyecto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http.post<Proyecto>(this.url, proyecto);
  }

  update(id: number, proyecto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http.put<Proyecto>(`${this.url}/${id}`, proyecto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  uploadDocument(id: number, file: File): Observable<Proyecto> {
    const fd = new FormData();
    fd.append('archivo', file, file.name);
    return this.http.post<Proyecto>(`${this.url}/${id}/documentos`, fd);
  }

  deleteDocument(id: number, itemId: string): Observable<Proyecto> {
    return this.http.delete<Proyecto>(`${this.url}/${id}/documentos/${itemId}`);
  }
}
