import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Requerimiento } from '../models';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './project.service';

export interface FiltroRequerimiento {
  proyectoId?: number;
  tipo?: string;
  estado?: string;
  prioridad?: string;
  busqueda?: string;
  pagina?: number;
  porPagina?: number;
}

@Injectable({ providedIn: 'root' })
export class RequirementService {
  private readonly url = `${environment.apiUrl}/requerimientos`;

  constructor(private http: HttpClient) {}

  getAll(filtro?: FiltroRequerimiento): Observable<PaginatedResponse<Requerimiento>> {
    let params = new HttpParams();
    if (filtro) {
      Object.entries(filtro).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<PaginatedResponse<Requerimiento>>(this.url, { params });
  }

  getById(id: number): Observable<Requerimiento> {
    return this.http.get<Requerimiento>(`${this.url}/${id}`);
  }

  getByProyecto(proyectoId: number): Observable<Requerimiento[]> {
    return this.http.get<Requerimiento[]>(`${environment.apiUrl}/proyectos/${proyectoId}/requerimientos`);
  }

  getNextCodigo(proyectoId: number): Observable<{ codigo: string }> {
    return this.http.get<{ codigo: string }>(`${this.url}/next-codigo`, {
      params: new HttpParams().set('proyectoId', String(proyectoId)),
    });
  }

  create(req: Partial<Requerimiento>): Observable<Requerimiento> {
    return this.http.post<Requerimiento>(this.url, req);
  }

  update(id: number, req: Partial<Requerimiento>): Observable<Requerimiento> {
    return this.http.put<Requerimiento>(`${this.url}/${id}`, req);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
