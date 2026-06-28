import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EjecucionCasoPrueba } from '../models';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './project.service';

export interface FiltroEjecucion {
  casoPruebaId?: number;
  proyectoId?: number;
  resultado?: string;
  ambiente?: string;
  testerId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  pagina?: number;
  porPagina?: number;
}

@Injectable({ providedIn: 'root' })
export class EjecucionService {
  private readonly url = `${environment.apiUrl}/ejecuciones`;

  constructor(private http: HttpClient) {}

  create(dto: Partial<EjecucionCasoPrueba>): Observable<EjecucionCasoPrueba> {
    return this.http.post<EjecucionCasoPrueba>(this.url, dto);
  }

  getAll(filtro?: FiltroEjecucion): Observable<PaginatedResponse<EjecucionCasoPrueba>> {
    let params = new HttpParams();
    if (filtro) {
      Object.entries(filtro).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<PaginatedResponse<EjecucionCasoPrueba>>(this.url, { params });
  }

  getByCasoPrueba(casoPruebaId: number): Observable<EjecucionCasoPrueba[]> {
    return this.http.get<EjecucionCasoPrueba[]>(`${this.url}/caso-prueba/${casoPruebaId}`);
  }
}
