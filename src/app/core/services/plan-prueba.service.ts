import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlanPrueba, TrazabilidadPlan } from '../models';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './project.service';

export interface FiltroPlan {
  proyectoId?: number;
  estado?: string;
  pagina?: number;
  porPagina?: number;
}

@Injectable({ providedIn: 'root' })
export class PlanPruebaService {
  private readonly url = `${environment.apiUrl}/planes-prueba`;

  constructor(private http: HttpClient) {}

  getAll(filtro?: FiltroPlan): Observable<PaginatedResponse<PlanPrueba>> {
    let params = new HttpParams();
    if (filtro) {
      Object.entries(filtro).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<PaginatedResponse<PlanPrueba>>(this.url, { params });
  }

  getById(id: number): Observable<PlanPrueba> {
    return this.http.get<PlanPrueba>(`${this.url}/${id}`);
  }

  create(plan: any): Observable<PlanPrueba> {
    return this.http.post<PlanPrueba>(this.url, plan);
  }

  update(id: number, plan: any): Observable<PlanPrueba> {
    return this.http.put<PlanPrueba>(`${this.url}/${id}`, plan);
  }

  cerrar(id: number): Observable<PlanPrueba> {
    return this.http.patch<PlanPrueba>(`${this.url}/${id}/cerrar`, {});
  }

  reabrir(id: number): Observable<PlanPrueba> {
    return this.http.patch<PlanPrueba>(`${this.url}/${id}/reabrir`, {});
  }

  getTrazabilidad(id: number): Observable<TrazabilidadPlan> {
    return this.http.get<TrazabilidadPlan>(`${this.url}/${id}/trazabilidad`);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
