import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CicloService, CasoCiclo } from '../../../core/services/ciclo.service';
import { EjecucionService } from '../../../core/services/ejecucion.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  CicloPrueba, EstadoCiclo, Usuario, Rol,
  ResultadoEjecucion, AmbienteEjecucion,
  SeveridadDefecto, PrioridadDefecto,
} from '../../../core/models';

@Component({
  selector: 'app-ciclo-ejecucion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ciclo-ejecucion.component.html',
})
export class CicloEjecucionComponent implements OnInit {
  private route            = inject(ActivatedRoute);
  private router           = inject(Router);
  private cicloService     = inject(CicloService);
  private ejecucionService = inject(EjecucionService);
  private userService      = inject(UserService);
  private projectService   = inject(ProjectService);
  auth                     = inject(AuthService);

  cicloId!: number;
  ciclo: CicloPrueba | null = null;
  casos: CasoCiclo[] = [];
  usuarios: Usuario[] = [];
  desarrolladores: Usuario[] = [];
  pmProyectoId: number | null = null;
  cargando = signal(false);
  error = '';

  get pmUsuario(): Usuario | null {
    if (!this.pmProyectoId) return null;
    return this.usuarios.find(u => u.id === this.pmProyectoId) ?? null;
  }

  get mostrarPMEnDropdown(): boolean {
    if (!this.pmProyectoId) return false;
    return !this.desarrolladores.some(d => d.id === this.pmProyectoId);
  }

  readonly EstadoCiclo       = EstadoCiclo;
  readonly resultadosEjecucion = Object.values(ResultadoEjecucion);
  readonly ambientes           = Object.values(AmbienteEjecucion);
  readonly severidades         = Object.values(SeveridadDefecto);
  readonly prioridades         = Object.values(PrioridadDefecto);

  readonly resultadoClase: Record<string, string> = {
    Aprobado:  'badge-resultado-aprobado',
    Fallido:   'badge-resultado-fallido',
    Bloqueado: 'badge-resultado-bloqueado',
    Omitido:   'badge-resultado-no-ejecutado',
  };

  // ─── Panel ejecución ─────────────────────────────────────────────────────
  guardandoEjec  = signal(false);
  errorEjecucion = '';
  ejecucionExito = signal<string | null>(null);
  casoSeleccionado: CasoCiclo | null = null;
  pasosEjecucion: { orden: number; descripcion: string; resultadoEsperado: string; estado: 'pendiente' | 'ok' | 'no_ok'; imagenes: string[] }[] = [];

  formEjecucion = {
    testerId:             0,
    ambiente:             '' as AmbienteEjecucion | '',
    version:              '',
    resultado:            '' as ResultadoEjecucion | '',
    resultadoObtenido:    '',
    evidenciaUrl:         '',
    observaciones:        '',
    defTitulo:            '',
    defDescripcion:       '',
    defPasosReproduccion: '',
    defResultadoEsperado: '',
    defSeveridad:         '' as SeveridadDefecto | '',
    defPrioridad:         '' as PrioridadDefecto | '',
    defAsignadoA:         null as number | null,
  };

  get esFallido(): boolean {
    return this.formEjecucion.resultado === ResultadoEjecucion.FALLIDO;
  }

  get totalEjecutados(): number {
    return this.casos.filter(c => c.resultadoCiclo != null).length;
  }

  get totalAprobados(): number {
    return this.casos.filter(c => c.resultadoCiclo === 'Aprobado').length;
  }

  get totalFallidos(): number {
    return this.casos.filter(c => c.resultadoCiclo === 'Fallido' || c.resultadoCiclo === 'Bloqueado').length;
  }

  ngOnInit(): void {
    this.cicloId = Number(this.route.snapshot.paramMap.get('id'));

    this.userService.getAll({ porPagina: 500 }).subscribe(r => { this.usuarios = r.datos; });
    this.userService.getAll({ rol: Rol.DEVELOPER, activo: true, porPagina: 200 }).subscribe(r => {
      this.desarrolladores = r.datos;
    });

    this.cicloService.getById(this.cicloId).subscribe({
      next: (c) => {
        this.ciclo = c;
        this.projectService.getById(c.proyectoId).subscribe(p => {
          this.pmProyectoId = p.jefeProyectoId ?? null;
        });
      },
      error: () => { this.error = 'No se pudo cargar el ciclo.'; },
    });

    this.cargarCasos();
  }

  cargarCasos(): void {
    this.cargando.set(true);
    this.cicloService.getCasosDeCiclo(this.cicloId).subscribe({
      next: (casos) => { this.casos = casos; this.cargando.set(false); },
      error: () => { this.cargando.set(false); },
    });
  }

  seleccionarCaso(caso: CasoCiclo): void {
    if (this.casoSeleccionado?.id === caso.id && !this.ejecucionExito()) return;
    this.ejecucionExito.set(null);
    this.casoSeleccionado = caso;
    this.errorEjecucion = '';
    this.pasosEjecucion = (caso.pasos ?? []).map((p: any) => ({
      orden: p.orden,
      descripcion: p.descripcion,
      resultadoEsperado: p.resultadoEsperado ?? '',
      estado: 'pendiente' as const,
      imagenes: [] as string[],
    }));
    const userId     = this.auth.usuarioActual()?.id ?? 0;
    const pasosTexto = this.pasosATexto(caso.pasos ?? []);
    this.formEjecucion = {
      testerId:             userId,
      ambiente:             (this.ciclo?.ambiente as AmbienteEjecucion | '') ?? '',
      version:              '',
      resultado:            '' as ResultadoEjecucion | '',
      resultadoObtenido:    '',
      evidenciaUrl:         '',
      observaciones:        '',
      defTitulo:            '',
      defDescripcion:       caso.descripcion ?? '',
      defPasosReproduccion: pasosTexto,
      defResultadoEsperado: caso.resultadoEsperado ?? '',
      defSeveridad:         '' as SeveridadDefecto | '',
      defPrioridad:         '' as PrioridadDefecto | '',
      defAsignadoA:         this.pmProyectoId ?? null,
    };
    this.ejecucionService.getByCasoPrueba(caso.id).subscribe(ejecuciones => {
      this.formEjecucion.version = String(ejecuciones.length + 1);
    });
  }

  limpiarSeleccion(): void {
    this.casoSeleccionado = null;
    this.errorEjecucion = '';
    this.ejecucionExito.set(null);
    this.pasosEjecucion = [];
  }

  limpiarImagenPaso(pasoIdx: number, imgIdx: number): void {
    const imgs = [...this.pasosEjecucion[pasoIdx].imagenes];
    imgs.splice(imgIdx, 1);
    this.pasosEjecucion[pasoIdx] = { ...this.pasosEjecucion[pasoIdx], imagenes: imgs };
  }

  pegarImagenPaso(idx: number, event: ClipboardEvent): void {
    event.preventDefault();
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) this.leerArchivoImagenPaso(file, idx);
        break;
      }
    }
  }

  onFileSelectedPaso(event: Event, idx: number): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) Array.from(files).forEach(f => { if (f.type.startsWith('image/')) this.leerArchivoImagenPaso(f, idx); });
    (event.target as HTMLInputElement).value = '';
  }

  private leerArchivoImagenPaso(file: File, idx: number): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imagenes = [...this.pasosEjecucion[idx].imagenes, e.target?.result as string];
      this.pasosEjecucion[idx] = { ...this.pasosEjecucion[idx], imagenes };
    };
    reader.readAsDataURL(file);
  }

  marcarPaso(idx: number, estado: 'ok' | 'no_ok'): void {
    this.pasosEjecucion[idx].estado =
      this.pasosEjecucion[idx].estado === estado ? 'pendiente' : estado;
    const pasos    = this.pasosEjecucion;
    const hayNoOk  = pasos.some(p => p.estado === 'no_ok');
    const todosOk  = pasos.every(p => p.estado === 'ok');
    if (hayNoOk) {
      this.formEjecucion.resultado = ResultadoEjecucion.FALLIDO;
      this.formEjecucion.defPasosReproduccion = pasos
        .filter(p => p.estado === 'no_ok')
        .map(p => `${p.orden}. ${p.descripcion}`)
        .join('\n');
    } else if (todosOk) {
      this.formEjecucion.resultado = ResultadoEjecucion.APROBADO;
    }
  }

  guardarEjecucion(): void {
    const f = this.formEjecucion;
    if (!f.ambiente || !f.resultado || !f.resultadoObtenido || !f.testerId) {
      this.errorEjecucion = !f.ambiente
        ? 'El ciclo no tiene ambiente configurado. Edita el ciclo y asigna un ambiente antes de registrar ejecuciones.'
        : 'Completa los campos obligatorios: Tester, Resultado y Resultado Obtenido.';
      return;
    }
    if (this.esFallido && (!f.defTitulo.trim() || !f.defDescripcion.trim() || !f.defPasosReproduccion.trim() || !f.defSeveridad || !f.defPrioridad)) {
      this.errorEjecucion = 'Para resultado Fallido completa: Título, Descripción, Pasos para reproducir, Severidad y Prioridad.';
      return;
    }
    this.errorEjecucion = '';
    this.guardandoEjec.set(true);

    const caso      = this.casoSeleccionado!;
    const esFallido = this.esFallido;

    const ejPayload: any = {
      casoPruebaId:      caso.id,
      proyectoId:        caso.proyectoId,
      cicloId:           this.cicloId,
      testerId:          f.testerId,
      ambiente:          f.ambiente,
      version:           f.version,
      resultado:         f.resultado,
      resultadoObtenido: f.resultadoObtenido,
      evidenciaUrl:      f.evidenciaUrl  || undefined,
      observaciones:     f.observaciones || undefined,
      desarrolladorId:   esFallido && f.defAsignadoA ? f.defAsignadoA : undefined,
      ...(esFallido && {
        defectoData: {
          titulo:            f.defTitulo.trim(),
          descripcion:       f.defDescripcion.trim() || caso.descripcion,
          pasosReproduccion: f.defPasosReproduccion.trim(),
          resultadoObtenido: f.resultadoObtenido,
          resultadoEsperado: f.defResultadoEsperado.trim() || caso.resultadoEsperado,
          ambiente:          f.ambiente,
          version:           f.version,
          severidad:         f.defSeveridad,
          prioridad:         f.defPrioridad,
          asignadoA:         f.defAsignadoA ?? undefined,
        },
      }),
    };

    this.ejecucionService.create(ejPayload).subscribe({
      next: (res: any) => {
        this.guardandoEjec.set(false);
        this.cargarCasos();
        if (esFallido) {
          const codigoDefecto = res?.defecto?.codigoProyecto ?? res?.defecto?.codigo ?? 'INC-???';
          this.ejecucionExito.set(codigoDefecto);
        } else {
          this.limpiarSeleccion();
        }
      },
      error: (err: any) => {
        this.guardandoEjec.set(false);
        this.errorEjecucion = 'Error al registrar la ejecución: ' + (err?.error?.message ?? 'Error desconocido');
      },
    });
  }

  nombreUsuario(u: Usuario): string {
    return `${u.nombre} ${u.apellido}`;
  }

  private pasosATexto(pasos: any[]): string {
    if (!pasos?.length) return '';
    return pasos.map((p: any) => `${p.orden}. ${p.descripcion}`).join('\n');
  }
}
