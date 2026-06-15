import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CasoPrueba, ImportacionResultado } from '../models';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './project.service';

export interface FiltroCasoPrueba {
  proyectoId?: number;
  requerimientoId?: number;
  estado?: string;
  tipo?: string;
  prioridad?: string;
  resultado?: string;
  responsableQaId?: number;
  busqueda?: string;
  pagina?: number;
  porPagina?: number;
}

export interface ImportarPayload {
  casos: Partial<CasoPrueba>[];
}

@Injectable({ providedIn: 'root' })
export class TestCaseService {
  private readonly url = `${environment.apiUrl}/casos-prueba`;

  constructor(private http: HttpClient) {}

  getAll(filtro?: FiltroCasoPrueba): Observable<PaginatedResponse<CasoPrueba>> {
    let params = new HttpParams();
    if (filtro) {
      Object.entries(filtro).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<PaginatedResponse<CasoPrueba>>(this.url, { params });
  }

  getById(id: number): Observable<CasoPrueba> {
    return this.http.get<CasoPrueba>(`${this.url}/${id}`);
  }

  getByProyecto(proyectoId: number): Observable<CasoPrueba[]> {
    return this.http.get<CasoPrueba[]>(`${environment.apiUrl}/proyectos/${proyectoId}/casos-prueba`);
  }

  create(caso: Partial<CasoPrueba>): Observable<CasoPrueba> {
    return this.http.post<CasoPrueba>(this.url, caso);
  }

  update(id: number, caso: Partial<CasoPrueba>): Observable<CasoPrueba> {
    return this.http.put<CasoPrueba>(`${this.url}/${id}`, caso);
  }

  importarDesdeExcel(payload: ImportarPayload): Observable<ImportacionResultado> {
    return this.http.post<ImportacionResultado>(`${this.url}/importar`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
