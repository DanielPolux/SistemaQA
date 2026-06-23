# CLAUDE.md — Sistema QA (Frontend)

Guía de contexto para Claude Code al trabajar en este proyecto.

## Resumen del Proyecto

**Sistema QA** es una aplicación Angular 18 para gestión de calidad de software. Maneja proyectos, requerimientos, casos de prueba, ciclos de prueba, ejecuciones, defectos y planes de prueba con autenticación JWT y control de acceso por roles.

**Stack:** Angular 18 (standalone components + signals) · TypeScript strict · SCSS · REST API

---

## Arquitectura

```
src/app/
├── core/           # Singleton: modelos, servicios HTTP, guards, interceptors
├── features/       # Lazy-loaded por ruta: auth, projects, requirements, test-cases,
│                   #   defects, users, ejecuciones, ciclos, planes-prueba, catalogos, dashboard
└── layout/         # Header y Sidebar (siempre visibles cuando autenticado)
```

**Patrón:** cada feature tiene sus propios `*.routes.ts`, componentes standalone y usa servicios del `core/`.

---

## Convenciones Clave

### Componentes
- Todos son **standalone** (`standalone: true`). No usar NgModules.
- Usar **signals** para estado reactivo del componente (`signal`, `computed`).
- El `AuthService` expone `usuarioActual` como `signal<Usuario | null>`.
- Plantillas usan **control flow** de Angular 17+: `@if`, `@for`, `@empty` — NO `*ngIf`/`*ngFor`.

### Servicios HTTP
- Todos los servicios están en `src/app/core/services/`.
- Método `getAll()` acepta un objeto filtro opcional y retorna `PaginatedResponse<T>`.
- El `authInterceptor` adjunta `Authorization: Bearer <token>` automáticamente.
- La URL base viene de `environment.apiUrl` — no hardcodear URLs.

### Rutas
- Todas protegidas con `authGuard` excepto `/auth/login`.
- Sección `/usuarios` protegida adicionalmente con `roleGuard([Rol.ADMIN])`.
- Sección `/ciclos` y `/planes-prueba` protegidas con `roleGuard([Rol.QA_LEAD, Rol.PROJECT_MANAGER, Rol.ADMIN])`.
- Usar `loadComponent` y `loadChildren` para lazy loading — no importar componentes directamente en rutas.

### Modelos
- Todos los tipos viven en `src/app/core/models/`, re-exportados desde `index.ts`.
- Siempre importar desde `'../../../core/models'` (barrel), no desde archivos individuales.
- Los enums usan valores en español (los mismos que muestra la UI).

### Formularios
- Usar **Reactive Forms** (`FormBuilder`, `FormGroup`, `FormArray`).
- Validación con `Validators` de Angular — no validación custom en templates.

### Paginación (patrón estándar en todos los listados)
- Getter `get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }`
- Getter `get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }`
- Método `cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }`
- En `cargar()`, guard post-carga: si `res.datos.length === 0 && pagina > 1`, redirige a `Math.max(1, totalPaginas)` y recarga.
- Template: `@if (totalPaginas > 1)` con botones `‹ Anterior`, números y `Siguiente ›` usando `[disabled]`.
- `buscar()` siempre resetea `pagina = 1` antes de `cargar()`.

---

## Modelos principales (`core/models/`)

| Archivo | Interfaces / Enums clave |
|---|---|
| `project.model.ts` | `Proyecto`, `EstadoProyecto` |
| `requirement.model.ts` | `Requerimiento`, `EstadoRequerimiento`, `PrioridadRequerimiento` |
| `test-case.model.ts` | `CasoPrueba`, `EstadoCasoPrueba`, `ResultadoCasoPrueba`, `TipoPrueba` |
| `defect.model.ts` | `Defecto`, `EstadoDefecto`, `SeveridadDefecto`, `PrioridadDefecto`, `AmbienteDefecto` |
| `ejecucion.model.ts` | `EjecucionCasoPrueba`, `ResultadoEjecucion`, `AmbienteEjecucion` |
| `ciclo-prueba.model.ts` | `CicloPrueba`, `EstadoCiclo` |
| `plan-prueba.model.ts` | `PlanPrueba`, `EstadoPlan`, `TrazabilidadPlan` |
| `user.model.ts` | `Usuario`, `Rol` |

---

## Servicios HTTP (`core/services/`)

| Servicio | URL base | Notas |
|---|---|---|
| `ProjectService` | `/proyectos` | |
| `RequirementService` | `/requerimientos` | |
| `TestCaseService` | `/casos-prueba` | |
| `DefectService` | `/defectos` | |
| `EjecucionService` | `/ejecuciones` | |
| `CicloService` | `/ciclos-prueba` | Incluye `getActivoByProyecto()` |
| `PlanPruebaService` | `/planes-prueba` | Incluye `getTrazabilidad()` |
| `UserService` | `/usuarios` | |
| `AuditoriaService` | `/auditoria` | |
| `WordExportService` | — | Exporta defectos a DOCX (docx + file-saver) |
| `WordExportPlanService` | — | Exporta trazabilidad a DOCX con tabla coloreada |

---

## Relaciones entre Entidades

```
Proyecto (1) ──────────────── (N) Requerimiento
Proyecto (1) ──────────────── (N) Caso de Prueba
Proyecto (1) ──────────────── (N) Ciclo de Prueba
Requerimiento (1) ──────────── (N) Caso de Prueba  [opcional]
Caso de Prueba (1) ─────────── (N) Ejecución
Ciclo de Prueba (1) ────────── (N) Ejecución        [auto-asignado]
Ejecución (0..1) ───────────── (1) Defecto          [auto-vinculado en Fallido]
Caso de Prueba (1) ─────────── (N) Defecto
Plan de Prueba (1) ─────────── (N) Ciclo de Prueba  [agrupación]
```

---

## Roles y Permisos

| Rol              | Enum value            | Alcance                                   |
|------------------|-----------------------|-------------------------------------------|
| `Administrador`  | `Rol.ADMIN`           | Acceso total incluido gestión de usuarios |
| `QA Lead`        | `Rol.QA_LEAD`         | CRUD en requerimientos, casos, ciclos, defectos, planes |
| `QA Tester`      | `Rol.QA_TESTER`       | Ejecutar casos y reportar defectos        |
| `Desarrollador`  | `Rol.DEVELOPER`       | Ver y resolver defectos asignados         |
| `Project Manager`| `Rol.PROJECT_MANAGER` | CRUD proyectos, ciclos, planes, ver resto |

El guard `roleGuard(rolesPermitidos)` es una función que retorna `CanActivateFn`.

---

## Comportamientos clave a recordar

### Ciclos de Prueba
- Solo puede haber **un ciclo activo por proyecto** a la vez.
- Al crear: el modal previo y el formulario verifican si ya existe un ciclo activo (llamada a `getActivoByProyecto()`); si existe, bloquean la creación con mensaje de error antes de llegar al backend.
- El backend también valida esto y lanza `400 BadRequest` si se intenta crear con ciclo activo existente.
- Si no hay ciclo activo, el botón "Ejecutar" en la grilla de casos muestra un **popup de error** (no abre el modal).
- La grilla de ciclos muestra: Nombre, Proyecto, Estado (badge), Fechas, Total Ejecuciones, Acciones.
- Solo se puede eliminar un ciclo si `totalEjecuciones === 0`.

### Modal de Ejecución (en Casos de Prueba)
- Cuando resultado = `Fallido`: aparece el bloque "Datos del Defecto" con todos los campos inline.
- Campo "Evidencia (URL)": cuando resultado ≠ Fallido se muestra antes del bloque; cuando = Fallido se mueve al final del bloque de defecto.
- Al guardar con Fallido: crea la ejecución, luego crea el defecto; muestra pantalla de éxito con código `INC-XXX`.
- El ciclo activo se muestra en un banner verde dentro del modal.

### Planes de Prueba y Trazabilidad
- Un plan agrupa ciclos de prueba de un proyecto.
- Al crear un ciclo vinculado a un plan, el plan avanza automáticamente a estado `En ejecución`.
- La vista de trazabilidad (`/planes-prueba/:id/trazabilidad`) muestra la matriz req → caso → resultado con colores por estado.
- Se puede exportar la trazabilidad a **CSV** o a **Word** (.docx) con tabla coloreada.
- La exportación Word usa `docx` + `file-saver` desde `WordExportPlanService`.

### Defectos
- Código global: `DEF-XXXX` (auto-incremento total). Código de proyecto: `INC-XXX` (por proyecto).
- La grilla de defectos muestra `codigoProyecto` (INC-XXX) en la columna "Defecto".
- El defecto recién creado se auto-vincula a la última ejecución `Fallido` sin defecto para ese caso.
- La grilla de defectos incluye filtro por **proyecto** (dropdown) además de severidad y estado.

### Historial de Auditoría de Defectos
- La vista `/defectos/:id` (`defect-detail.component`) muestra una sección "Historial de Auditoría" al pie.
- Se carga con `AuditoriaService.getByDefecto(id)` en `ngOnInit` después de cargar el defecto.
- Columnas: Fecha, Usuario, Acción, Detalle (`valorNuevo ?? valorAnterior`).
- Las acciones usan badges de color: `audit-accion--ok` (verde) para "Correo Enviado", `audit-accion--err` (rojo) para "Error Correo", neutro para el resto.
- El bloque de auditoría está **dentro** del `@if (!cargando && defecto)` — no mostrarlo cuando no hay defecto cargado.

### Notificaciones por Correo (Defectos)
- El backend envía correos automáticamente; el frontend no dispara ninguna llamada de correo.
- Los eventos de correo quedan visibles en el Historial de Auditoría del defecto.
- Flujo desde el modal de ejecución (`Fallido`): el backend crea ejecución + defecto en transacción, luego (fuera de la transacción) registra auditoría "Creado" y envía el correo.
- El PM puede reasignar el defecto a un developer editando `asignadoA` desde el formulario de edición → el backend detecta el cambio y envía correo `[Defecto Asignado]`.

### Dashboard
- Muestra KPIs, gráficas de casos por estado, defectos por severidad/estado, últimas ejecuciones y últimos defectos.
- Si el usuario **no tiene proyectos asignados**, se muestra un estado vacío en lugar de las métricas:
  - Admin: mensaje "No hay proyectos creados" + botón "Crear Proyecto"
  - Non-admin: mensaje "No tienes proyectos asignados" + indicación de contactar al Administrador
- Las métricas (resumen, casosPorEstado, defectosPorSeveridad) están filtradas por usuario en el backend.

### Filtrado por usuario (todos los módulos)
- Non-admin: solo ven datos de proyectos en los que participan (jefe_proyecto, jefe_qa, responsable_qa, casos asignados, defectos asignados/reportados).
- Implementado en el backend usando `@CurrentUser()` + EXISTS subqueries.
- El frontend NO necesita lógica extra — `authInterceptor` envía el JWT automáticamente.
- Afecta: proyectos, requerimientos, casos de prueba, ciclos, ejecuciones, defectos, planes de prueba, dashboard stats.

### Selectores de Proyecto en Filtros
- Todos los listados usan `<select [(ngModel)]="proyectoId" (change)="buscar()">` para filtrar por proyecto.
- **No usar** `<input list="datalist">` para el proyecto — rompe la consistencia de UX.

---

## Estados de Entidades

### Proyecto
`Por Estimar → Estimado → Planificado → En Ejecución → Observado → Finalizado → En Producción`

### Ciclo de Prueba
`Activo → Cerrado` | `Cerrado → Activo` (reabrir)

### Plan de Prueba
`Borrador → Planificado → En ejecución → Cerrado`

### Caso de Prueba
`Pendiente → En Ejecución → Aprobado | Fallido | Bloqueado | Omitido`

### Defecto
`Nuevo → Asignado → En Progreso → En Revisión → Resuelto → Cerrado`
`Cerrado → Reabierto → En Progreso` (reapertura)
`Nuevo | Asignado → Rechazado` (falso positivo)

---

## Estilos

- Un único archivo global: `src/styles.scss`.
- Variables CSS en `:root` (colores, dimensiones del layout).
- Clases de utilidad globales: `.btn`, `.badge`, `.data-table`, `.form-group`, `.page-container`, `.stats-grid`.
- Clases de ciclos: `.ciclo-banner`, `.ciclo-banner--activo` (verde), `.badge-ciclo-activo`, `.badge-ciclo-cerrado`.
- Clases de defecto en modal: `.defecto-section`, `.defecto-section-title` (borde/fondo rojo).
- Auditoría de defecto: `.audit-table`, `.audit-fecha`, `.audit-valor`, `.audit-accion`, `.audit-accion--ok` (verde), `.audit-accion--err` (rojo).
- Dashboard vacío: `.dash-empty-state`, `.dash-empty-icon`, `.dash-empty-title`, `.dash-empty-desc`.
- Login: `.login-brand-logo-wrap` (fondo blanco, borde redondeado, sombra) sobre panel oscuro.
- **No crear archivos `.scss` por componente** a menos que el componente tenga estilos muy específicos y extensos.

---

## Comandos de Desarrollo

```bash
npm start              # Servidor de desarrollo en localhost:4200
npm run build:prod     # Build de producción en dist/sistema-qa/
npm test               # Tests unitarios con Karma
```

---

## Qué NO Hacer

- No usar `NgModule` — el proyecto es 100% standalone.
- No usar `*ngIf`/`*ngFor` — usar `@if`/`@for` del nuevo control flow.
- No hardcodear la URL de la API — siempre usar `environment.apiUrl`.
- No importar servicios directamente en templates — solo en constructores/`inject()`.
- No crear helpers globales en `app.component.ts` — colocarlos en `shared/` o `core/`.
- No omitir `track` en los bucles `@for`.
- No usar `any` explícito si puede evitarse con los tipos de `core/models`.
- No usar `[].constructor(N)` en templates para generar arrays de paginación — usar el getter `paginas`.
- No usar `<input list="datalist">` para selectores de proyecto — usar `<select>`.
