import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CatalogoService, Catalogo, GrupoResumen } from '../../core/services/catalogo.service';
import { AuthService } from '../../core/services/auth.service';

const ETIQUETAS_GRUPO: Record<string, string> = {
  ESTADO_DEFECTO:       'Estado de Defecto',
  SEVERIDAD_DEFECTO:    'Severidad de Defecto',
  PRIORIDAD_DEFECTO:    'Prioridad de Defecto',
  ESTADO_CASO_PRUEBA:   'Estado de Caso de Prueba',
  RESULTADO_CASO_PRUEBA:'Resultado de Caso de Prueba',
  RESULTADO_EJECUCION:  'Resultado de Ejecución',
  TIPO_PRUEBA:          'Tipo de Prueba',
  PRIORIDAD_CASO_PRUEBA:'Prioridad de Caso de Prueba',
  ESTADO_PROYECTO:      'Estado de Proyecto',
  ESTADO_DESARROLLO:    'Estado de Desarrollo',
  AMBIENTE_EJECUCION:   'Ambiente de Ejecución',
  ROL_USUARIO:          'Rol de Usuario',
};

@Component({
  selector: 'app-catalogos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './catalogos-list.component.html',
})
export class CatalogosListComponent implements OnInit {
  private service = inject(CatalogoService);
  auth            = inject(AuthService);
  private fb      = inject(FormBuilder);

  grupos:  GrupoResumen[] = [];
  items:   Catalogo[]     = [];
  cargandoGrupos  = signal(false);
  cargandoItems   = signal(false);
  grupoActivo: string | null = null;

  // ─── Modal Nuevo / Editar ────────────────────────────────────────────────
  modalAbierto  = signal(false);
  guardando     = signal(false);
  errorModal    = '';
  editandoId: number | null = null;

  form = this.fb.group({
    grupo:       ['', Validators.required],
    codigo:      ['', Validators.required],
    nombre:      ['', Validators.required],
    descripcion: [''],
    orden:       [0],
    activo:      [true],
  });

  // ─── Modal Confirmar Eliminar ────────────────────────────────────────────
  modalEliminarAbierto = signal(false);
  eliminandoItem: Catalogo | null = null;

  ngOnInit(): void {
    this.cargarGrupos();
  }

  cargarGrupos(): void {
    this.cargandoGrupos.set(true);
    this.service.getGrupos().subscribe({
      next: g => { this.grupos = g; this.cargandoGrupos.set(false); },
      error: () => this.cargandoGrupos.set(false),
    });
  }

  seleccionarGrupo(grupo: string): void {
    if (this.grupoActivo === grupo) return;
    this.grupoActivo = grupo;
    this.items = [];
    this.cargandoItems.set(true);
    this.service.getAll(grupo).subscribe({
      next: items => { this.items = items; this.cargandoItems.set(false); },
      error: () => this.cargandoItems.set(false),
    });
  }

  etiquetaGrupo(grupo: string): string {
    return ETIQUETAS_GRUPO[grupo] ?? grupo;
  }

  // ─── Abrir modal nuevo ───────────────────────────────────────────────────
  abrirNuevo(): void {
    this.editandoId = null;
    this.errorModal = '';
    this.form.reset({ grupo: this.grupoActivo ?? '', codigo: '', nombre: '', descripcion: '', orden: 0, activo: true });
    this.modalAbierto.set(true);
  }

  // ─── Abrir modal editar ──────────────────────────────────────────────────
  abrirEditar(item: Catalogo): void {
    this.editandoId = item.id;
    this.errorModal = '';
    this.form.patchValue({
      grupo:       item.grupo,
      codigo:      item.codigo,
      nombre:      item.nombre,
      descripcion: item.descripcion ?? '',
      orden:       item.orden,
      activo:      item.activo,
    });
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.form.reset();
    this.editandoId = null;
    this.errorModal = '';
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando.set(true);
    this.errorModal = '';

    const val = this.form.value;
    const dto = {
      grupo:       val.grupo!,
      codigo:      val.codigo!,
      nombre:      val.nombre!,
      descripcion: val.descripcion || undefined,
      orden:       val.orden ?? 0,
      activo:      val.activo ?? true,
    };

    const req = this.editandoId
      ? this.service.update(this.editandoId, dto)
      : this.service.create(dto);

    req.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.cargarGrupos();
        if (this.grupoActivo) this.seleccionarGrupo(this.grupoActivo);
      },
      error: err => {
        this.errorModal = err.error?.message ?? 'Error al guardar';
        this.guardando.set(false);
      },
    });
  }

  // ─── Eliminar ────────────────────────────────────────────────────────────
  abrirEliminar(item: Catalogo): void {
    this.eliminandoItem = item;
    this.modalEliminarAbierto.set(true);
  }

  cerrarEliminar(): void {
    this.modalEliminarAbierto.set(false);
    this.eliminandoItem = null;
  }

  confirmarEliminar(): void {
    if (!this.eliminandoItem) return;
    this.service.delete(this.eliminandoItem.id).subscribe({
      next: () => {
        this.cerrarEliminar();
        this.cargarGrupos();
        if (this.grupoActivo) this.seleccionarGrupo(this.grupoActivo);
      },
      error: err => {
        alert(err.error?.message ?? 'No se puede eliminar este ítem.');
        this.cerrarEliminar();
      },
    });
  }

  toggleActivo(item: Catalogo): void {
    this.service.update(item.id, { activo: !item.activo }).subscribe(() => {
      item.activo = !item.activo;
      this.cargarGrupos();
    });
  }
}
