import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  auth = inject(AuthService);

  stats = signal<DashboardStats | null>(null);
  cargando = signal(true);

  readonly severidadClase: Record<string, string> = {
    'Crítico': 'badge-sev-critico',
    'Alto':    'badge-sev-alto',
    'Medio':   'badge-sev-medio',
    'Bajo':    'badge-sev-bajo',
  };

  readonly estadoDefectoClase: Record<string, string> = {
    'Nuevo':       'badge-est-nuevo',
    'Asignado':    'badge-est-asignado',
    'En Progreso': 'badge-est-en-progreso',
    'En Revisión': 'badge-est-en-revision',
    'Resuelto':    'badge-est-resuelto',
    'Cerrado':     'badge-est-cerrado',
    'Reabierto':   'badge-est-reabierto',
    'Rechazado':   'badge-est-rechazado',
  };

  readonly resultadoClase: Record<string, string> = {
    'Aprobado':  'badge-resultado-aprobado',
    'Fallido':   'badge-resultado-fallido',
    'Bloqueado': 'badge-resultado-bloqueado',
    'Omitido':   'badge-resultado-no-ejecutado',
  };

  readonly estadoCasoColor: Record<string, string> = {
    'Pendiente':    '#94a3b8',
    'En Ejecución': '#3b82f6',
    'Ejecutado':    '#22c55e',
    'Bloqueado':    '#ef4444',
    'Omitido':      '#a78bfa',
  };

  readonly severidadColor: Record<string, string> = {
    'Crítico': '#7f1d1d',
    'Alto':    '#dc2626',
    'Medio':   '#f59e0b',
    'Bajo':    '#94a3b8',
  };

  readonly today = new Date();

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe({
      next: data => { this.stats.set(data); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  get usuario()   { return this.auth.usuarioActual(); }
  get s()         { return this.stats(); }
  get esTester()  { return this.auth.esTester(); }

  totalCasos(arr: { total: number }[]): number {
    return arr.reduce((s, x) => s + x.total, 0);
  }

  pct(value: number, total: number): number {
    return total === 0 ? 0 : Math.round((value / total) * 100);
  }
}
