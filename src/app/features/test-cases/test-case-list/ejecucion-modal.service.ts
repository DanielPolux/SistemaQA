import { Injectable, inject, signal } from '@angular/core';
import { EjecucionService } from '../../../core/services/ejecucion.service';
import { CicloService } from '../../../core/services/ciclo.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  AmbienteEjecucion, CasoPrueba, CicloPrueba, EstadoProyecto,
  PrioridadDefecto, Proyecto, ResultadoEjecucion, SeveridadDefecto,
} from '../../../core/models';

export interface PasoEjecucion {
  orden: number;
  descripcion: string;
  resultadoEsperado: string;
  estado: 'pendiente' | 'ok' | 'no_ok';
  imagenes: string[];
}

@Injectable()
export class EjecucionModalService {
  private ejecucionService = inject(EjecucionService);
  private cicloService     = inject(CicloService);
  readonly auth            = inject(AuthService);

  // ─── Execution modal state ────────────────────────────────────────────────
  modalAbierto   = signal(false);
  guardandoEjec  = signal(false);
  ejecucionExito = signal<string | null>(null);
  errorEjecucion = '';

  casoSeleccionado: CasoPrueba | null = null;
  cicloActivo: CicloPrueba | null     = null;
  pasosEjecucion: PasoEjecucion[]     = [];

  formEjecucion = this.formInicial();

  // ─── No-active-cycle popup ────────────────────────────────────────────────
  popupSinCicloAbierto = signal(false);
  popupSinCicloMsg     = '';

  abrirPopupSinCiclo(msg: string): void {
    this.popupSinCicloMsg = msg;
    this.popupSinCicloAbierto.set(true);
  }

  cerrarPopupSinCiclo(): void {
    this.popupSinCicloAbierto.set(false);
  }

  // ─── Open / close ────────────────────────────────────────────────────────
  abrirModal(caso: CasoPrueba, proyectos: Proyecto[]): void {
    const proyecto = proyectos.find(p => p.id === caso.proyectoId);

    if (proyecto && proyecto.estado !== EstadoProyecto.EN_EJECUCION) {
      this.abrirPopupSinCiclo(
        `El proyecto "${proyecto.nombre}" está en estado "${proyecto.estado}". ` +
        `Solo se pueden ejecutar casos de prueba cuando el proyecto está en estado "En Ejecución".`
      );
      return;
    }

    if (proyecto && (!proyecto.fechaInicioReal || !proyecto.fechaFinReal)) {
      this.abrirPopupSinCiclo(
        `El proyecto "${proyecto.nombre}" no tiene Fechas Reales de Entrega configuradas. ` +
        `Edita el proyecto e ingresa la Fecha Inicio Real y Fecha Fin Real antes de ejecutar casos de prueba.`
      );
      return;
    }

    this.cicloService.getActivoByProyecto(caso.proyectoId).subscribe(ciclo => {
      if (!ciclo) {
        this.abrirPopupSinCiclo(
          `El proyecto "${caso.proyectoNombre ?? 'seleccionado'}" no tiene un ciclo de prueba activo. ` +
          `Ve a Ciclos de Prueba, crea un nuevo ciclo o reactiva uno existente, y luego registra la ejecución.`
        );
        return;
      }
      if (!ciclo.planPruebaId) {
        this.abrirPopupSinCiclo(
          `El ciclo activo "${ciclo.nombre}" no está vinculado a un plan de prueba. ` +
          `Asocia el ciclo a un plan de prueba antes de registrar ejecuciones.`
        );
        return;
      }
      this.cicloActivo      = ciclo;
      this.casoSeleccionado = caso;
      this.pasosEjecucion   = ((caso as any).pasos ?? []).map((p: any) => ({
        orden: p.orden,
        descripcion: p.descripcion,
        resultadoEsperado: p.resultadoEsperado ?? '',
        estado: 'pendiente' as const,
        imagenes: [] as string[],
      }));

      const userId     = this.auth.usuarioActual()?.id ?? 0;
      const pasosTexto = pasosATexto((caso as any).pasos ?? []);
      this.formEjecucion = {
        ...this.formInicial(),
        testerId:             userId,
        defDescripcion:       (caso as any).descripcion ?? '',
        defPasosReproduccion: pasosTexto,
        defResultadoEsperado: (caso as any).resultadoEsperado ?? '',
      };

      this.ejecucionService.getByCasoPrueba(caso.id).subscribe(ejecuciones => {
        this.formEjecucion.version = String(ejecuciones.length + 1);
      });

      this.ejecucionExito.set(null);
      this.errorEjecucion = '';
      this.modalAbierto.set(true);
    });
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.casoSeleccionado = null;
    this.errorEjecucion   = '';
    this.ejecucionExito.set(null);
    this.pasosEjecucion   = [];
  }

  // ─── Pasos ────────────────────────────────────────────────────────────────
  marcarPaso(idx: number, estado: 'ok' | 'no_ok'): void {
    this.pasosEjecucion[idx].estado =
      this.pasosEjecucion[idx].estado === estado ? 'pendiente' : estado;
    this.sincronizarResultadoDesdePasos();
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

  get esFallido(): boolean {
    return this.formEjecucion.resultado === ResultadoEjecucion.FALLIDO;
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  guardarEjecucion(onSuccess: () => void): void {
    const f = this.formEjecucion;
    if (!f.ambiente || !f.resultado || !f.resultadoObtenido || !f.testerId) {
      this.errorEjecucion = 'Completa los campos obligatorios: Ambiente, Tester, Resultado y Resultado Obtenido.';
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
      cicloPrueba:       f.cicloPrueba     || undefined,
      testerId:          f.testerId,
      ambiente:          f.ambiente,
      version:           f.version,
      resultado:         f.resultado,
      resultadoObtenido: f.resultadoObtenido,
      evidenciaUrl:      f.evidenciaUrl    || undefined,
      desarrolladorId:   esFallido && f.defAsignadoA ? f.defAsignadoA : undefined,
      observaciones:     f.observaciones   || undefined,
      ...(esFallido && {
        defectoData: {
          titulo:            f.defTitulo.trim(),
          descripcion:       f.defDescripcion.trim() || caso.descripcion,
          pasosReproduccion: f.defPasosReproduccion.trim(),
          resultadoObtenido: f.resultadoObtenido,
          resultadoEsperado: f.defResultadoEsperado.trim() || (caso as any).resultadoEsperado,
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
        onSuccess();
        if (esFallido) {
          const codigoDefecto = res?.defecto?.codigoProyecto ?? res?.defecto?.codigo ?? 'INC-???';
          this.ejecucionExito.set(codigoDefecto);
        } else {
          this.cerrarModal();
        }
      },
      error: (err: any) => {
        this.guardandoEjec.set(false);
        this.errorEjecucion = 'Error al registrar la ejecución: ' + (err?.error?.message ?? 'Error desconocido');
      },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private formInicial() {
    return {
      cicloPrueba:          '',
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
  }

  private leerArchivoImagenPaso(file: File, idx: number): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imagenes = [...this.pasosEjecucion[idx].imagenes, e.target?.result as string];
      this.pasosEjecucion[idx] = { ...this.pasosEjecucion[idx], imagenes };
    };
    reader.readAsDataURL(file);
  }

  private sincronizarResultadoDesdePasos(): void {
    const pasos = this.pasosEjecucion;
    if (!pasos.length) return;
    const hayNoOk = pasos.some(p => p.estado === 'no_ok');
    const todosOk = pasos.every(p => p.estado === 'ok');
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
}

function pasosATexto(pasos: any[]): string {
  if (!pasos?.length) return '';
  return pasos.map((p: any) => `${p.orden}. ${p.descripcion}`).join('\n');
}
