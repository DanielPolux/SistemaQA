import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { saveAs } from 'file-saver';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Proyecto, ProyectoResumen } from '../../../core/models';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './project-detail.component.html'
})
export class ProjectDetailComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private service = inject(ProjectService);
  private toast   = inject(ToastService);
  auth            = inject(AuthService);

  proyecto?: Proyecto;
  resumen?: ProyectoResumen;
  cargando = true;
  error = '';

  get puedeArchivar(): boolean {
    return this.auth.esAdmin() || this.auth.esProjectManager();
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      proyecto: this.service.getById(id),
      resumen:  this.service.getResumen(id),
    }).subscribe({
      next: ({ proyecto, resumen }) => {
        this.proyecto = proyecto;
        this.resumen  = resumen;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.error = 'No se pudo cargar el proyecto. Verifica que existe y que tienes acceso.';
      },
    });
  }

  // ─── Fase 3 — archivar proyecto ─────────────────────────────────────────────

  descargandoPaquete = signal(false);
  paqueteDescargado  = signal(false);
  modalArchivarAbierto = signal(false);
  archivando   = signal(false);
  errorArchivar = '';

  descargarPaquete(): void {
    if (!this.proyecto) return;
    this.descargandoPaquete.set(true);
    this.service.descargarPaquete(this.proyecto.id).subscribe({
      next: (blob) => {
        this.descargandoPaquete.set(false);
        this.paqueteDescargado.set(true);
        const slug = this.proyecto!.nombre.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
        saveAs(blob, `${slug || 'proyecto'}-paquete.zip`);
      },
      error: () => {
        this.descargandoPaquete.set(false);
        this.toast.error('No se pudo generar el paquete del proyecto.');
      },
    });
  }

  abrirConfirmarArchivo(): void {
    this.errorArchivar = '';
    this.modalArchivarAbierto.set(true);
  }

  cerrarConfirmarArchivo(): void {
    this.modalArchivarAbierto.set(false);
  }

  confirmarArchivar(): void {
    if (!this.proyecto) return;
    this.archivando.set(true);
    this.errorArchivar = '';
    this.service.confirmarArchivo(this.proyecto.id).subscribe({
      next: ({ archivosEliminados }) => {
        this.archivando.set(false);
        this.modalArchivarAbierto.set(false);
        this.toast.exito(`${archivosEliminados} archivo(s) de evidencia eliminado(s) del servidor.`);
        // Recargar el proyecto para reflejar evidenciasArchivadasEn
        this.service.getById(this.proyecto!.id).subscribe((p) => { this.proyecto = p; });
      },
      error: (err) => {
        this.archivando.set(false);
        this.errorArchivar = err?.error?.message || 'No se pudo archivar las evidencias del proyecto.';
      },
    });
  }
}
