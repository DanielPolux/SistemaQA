import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Catalogo {
  id: number;
  grupo: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  sistema: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface GrupoResumen {
  grupo: string;
  total: number;
  activos: number;
}

export interface CreateCatalogoDto {
  grupo: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly url = `${environment.apiUrl}/catalogos`;

  constructor(private http: HttpClient) {}

  getGrupos(): Observable<GrupoResumen[]> {
    return this.http.get<GrupoResumen[]>(`${this.url}/grupos`);
  }

  getAll(grupo?: string): Observable<Catalogo[]> {
    let params = new HttpParams();
    if (grupo) params = params.set('grupo', grupo);
    return this.http.get<Catalogo[]>(this.url, { params });
  }

  create(dto: CreateCatalogoDto): Observable<Catalogo> {
    return this.http.post<Catalogo>(this.url, dto);
  }

  update(id: number, dto: Partial<CreateCatalogoDto>): Observable<Catalogo> {
    return this.http.put<Catalogo>(`${this.url}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
