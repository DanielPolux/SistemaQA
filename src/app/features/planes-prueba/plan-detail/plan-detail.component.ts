import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { PlanPruebaService } from '../../../core/services/plan-prueba.service';
import { AuthService } from '../../../core/services/auth.service';
import { WordExportService } from '../../../core/services/word-export.service';
import { PlanPrueba, EstadoPlan } from '../../../core/models';

@Component({
  selector: 'app-plan-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './plan-detail.component.html',
})
export class PlanDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private service    = inject(PlanPruebaService);
  private wordExport = inject(WordExportService);
  auth               = inject(AuthService);

  plan: PlanPrueba | null = null;
  cargando = signal(true);
  error    = '';

  readonly EstadoPlan = EstadoPlan;

  readonly estadoClase: Record<string, string> = {
    [EstadoPlan.BORRADOR]:     'badge-plan-borrador',
    [EstadoPlan.PLANIFICADO]:  'badge-plan-planificado',
    [EstadoPlan.EN_EJECUCION]: 'badge-ciclo-activo',
    [EstadoPlan.CERRADO]:      'badge-ciclo-cerrado',
  };

  readonly cicloEstadoClase: Record<string, string> = {
    Activo:  'badge-ciclo-activo',
    Cerrado: 'badge-ciclo-cerrado',
  };

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(id).subscribe({
      next:  (p) => { this.plan = p; this.cargando.set(false); },
      error: ()  => { this.error = 'No se pudo cargar el plan.'; this.cargando.set(false); },
    });
  }

  puedeGestionar(): boolean {
    return this.auth.esAdmin() || this.auth.esQaLead() || this.auth.esProjectManager();
  }

  cerrar(): void {
    if (!this.plan) return;
    this.service.cerrar(this.plan.id).subscribe(p => { this.plan = { ...this.plan!, ...p }; });
  }

  reabrir(): void {
    if (!this.plan) return;
    this.service.reabrir(this.plan.id).subscribe(p => { this.plan = { ...this.plan!, ...p }; });
  }

  exportarWord(): void {
    if (!this.plan) return;
    this.wordExport.exportarPlan(this.plan);
  }

  readonly validacionClaseMap: Record<string, string> = {
    'Validado':     'plan-badge-validacion--validado',
    'Con fallas':   'plan-badge-validacion--fallas',
    'En progreso':  'plan-badge-validacion--progreso',
    'Sin ejecutar': 'plan-badge-validacion--pendiente',
    'Sin casos':    'plan-badge-validacion--sincasos',
  };

  validacionClase(v: string): string {
    return this.validacionClaseMap[v] ?? 'badge';
  }

  get reqsValidados(): number {
    return this.plan?.requerimientos?.filter(r => r.estadoValidacion === 'Validado').length ?? 0;
  }
  get reqsConFallas(): number {
    return this.plan?.requerimientos?.filter(r => r.estadoValidacion === 'Con fallas').length ?? 0;
  }
  get totalCiclos(): number  { return this.plan?.ciclos?.length ?? 0; }
  get ciclosCerrados(): number {
    return this.plan?.ciclos?.filter(c => c.estado === 'Cerrado').length ?? 0;
  }
  get totalEjecuciones(): number {
    return this.plan?.ciclos?.reduce((acc, c) => acc + (c.totalEjecuciones ?? 0), 0) ?? 0;
  }
  get totalAprobados(): number {
    return this.plan?.ciclos?.reduce((acc, c) => acc + (c.aprobados ?? 0), 0) ?? 0;
  }
  get totalFallidos(): number {
    return this.plan?.ciclos?.reduce((acc, c) => acc + (c.fallidos ?? 0), 0) ?? 0;
  }
  get porcentajeExito(): number {
    if (!this.totalEjecuciones) return 0;
    return Math.round((this.totalAprobados / this.totalEjecuciones) * 100);
  }
}
