import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DefectService } from '../../../core/services/defect.service';
import { AuditoriaService, AuditoriaRegistro } from '../../../core/services/auditoria.service';
import { Defecto, EstadoDefecto, SeveridadDefecto, PrioridadDefecto } from '../../../core/models';

@Component({
  selector: 'app-defect-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './defect-detail.component.html'
})
export class DefectDetailComponent implements OnInit {
  private route            = inject(ActivatedRoute);
  private service          = inject(DefectService);
  private auditoriaService = inject(AuditoriaService);

  defecto?: Defecto;
  auditoria: AuditoriaRegistro[] = [];
  cargando = true;

  readonly estadoClase: Record<string, string> = {
    [EstadoDefecto.NUEVO]:       'badge-est-nuevo',
    [EstadoDefecto.ASIGNADO]:    'badge-est-asignado',
    [EstadoDefecto.EN_PROGRESO]: 'badge-est-en-progreso',
    [EstadoDefecto.EN_REVISION]: 'badge-est-en-revision',
    [EstadoDefecto.RESUELTO]:    'badge-est-resuelto',
    [EstadoDefecto.CERRADO]:     'badge-est-cerrado',
    [EstadoDefecto.REABIERTO]:   'badge-est-reabierto',
    [EstadoDefecto.RECHAZADO]:   'badge-est-rechazado',
  };

  readonly severidadClase: Record<string, string> = {
    [SeveridadDefecto.CRITICO]: 'badge-sev-critico',
    [SeveridadDefecto.ALTO]:    'badge-sev-alto',
    [SeveridadDefecto.MEDIO]:   'badge-sev-medio',
    [SeveridadDefecto.BAJO]:    'badge-sev-bajo',
  };

  readonly prioridadClase: Record<string, string> = {
    [PrioridadDefecto.URGENTE]: 'badge-pri-urgente',
    [PrioridadDefecto.ALTA]:    'badge-pri-alta',
    [PrioridadDefecto.MEDIA]:   'badge-pri-media',
    [PrioridadDefecto.BAJA]:    'badge-pri-baja',
  };

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(id).subscribe({
      next: d => {
        this.defecto = d;
        this.cargando = false;
        this.auditoriaService.getByDefecto(id).subscribe(r => { this.auditoria = r; });
      },
      error: () => { this.cargando = false; }
    });
  }

  accionClase(accion: string): string {
    if (accion === 'Correo Enviado') return 'audit-accion audit-accion--ok';
    if (accion === 'Error Correo')   return 'audit-accion audit-accion--err';
    return 'audit-accion';
  }
}
