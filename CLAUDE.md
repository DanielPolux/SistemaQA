# CLAUDE.md — Sistema QA

Guía de contexto para Claude Code al trabajar en este proyecto.

## Resumen del Proyecto

**Sistema QA** es una aplicación Angular 18 para gestión de calidad de software. Maneja proyectos, requerimientos, casos de prueba, ciclos de prueba, ejecuciones y defectos con autenticación JWT y control de acceso por roles.

**Stack:** Angular 18 (standalone components + signals) · TypeScript strict · SCSS · REST API

---

## Arquitectura

```
src/app/
├── core/           # Singleton: modelos, servicios HTTP, guards, interceptors
├── features/       # Lazy-loaded por ruta: auth, projects, requirements, test-cases,
│                   #   defects, users, ejecuciones, ciclos, catalogos, dashboard
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
- Sección `/ciclos` protegida con `roleGuard([Rol.QA_LEAD, Rol.PROJECT_MANAGER, Rol.ADMIN])`.
- Usar `loadComponent` y `loadChildren` para lazy loading — no importar componentes directamente en rutas.

### Modelos
- Todos los tipos viven en `src/app/core/models/`, re-exportados desde `index.ts`.
- Siempre importar desde `'../../../core/models'` (barrel), no desde archivos individuales.
- Los enums usan valores en español (los mismos que muestra la UI).

### Formularios
- Usar **Reactive Forms** (`FormBuilder`, `FormGroup`, `FormArray`).
- Validación con `Validators` de Angular — no validación custom en templates.

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
| `user.model.ts` | `Usuario`, `Rol` |

---

## Servicios HTTP (`core/services/`)

| Servicio | URL base |
|---|---|
| `ProjectService` | `/proyectos` |
| `RequirementService` | `/requerimientos` |
| `TestCaseService` | `/casos-prueba` |
| `DefectService` | `/defectos` |
| `EjecucionService` | `/ejecuciones` |
| `CicloService` | `/ciclos-prueba` |
| `UserService` | `/usuarios` |
| `AuditoriaService` | `/auditoria` |

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
```

---

## Roles y Permisos

| Rol              | Enum value            | Alcance                                   |
|------------------|-----------------------|-------------------------------------------|
| `Administrador`  | `Rol.ADMIN`           | Acceso total incluido gestión de usuarios |
| `QA Lead`        | `Rol.QA_LEAD`         | CRUD en requerimientos, casos, ciclos, defectos |
| `QA Tester`      | `Rol.QA_TESTER`       | Ejecutar casos y reportar defectos        |
| `Desarrollador`  | `Rol.DEVELOPER`       | Ver y resolver defectos asignados         |
| `Project Manager`| `Rol.PROJECT_MANAGER` | CRUD proyectos, ciclos, ver resto         |

El guard `roleGuard(rolesPermitidos)` es una función que retorna `CanActivateFn`.

---

## Comportamientos clave a recordar

### Ciclos de Prueba
- El backend auto-asigna el ciclo activo del proyecto a cada nueva ejecución.
- Si no hay ciclo activo, el botón "Ejecutar" en la grilla de casos de prueba muestra un **popup de error** (no abre el modal de ejecución).
- La grilla de ciclos (`/ciclos`) muestra: Nombre, Proyecto, Estado (badge), Fechas, Total Ejecuciones, Acciones (cerrar / reabrir / eliminar).
- Solo se puede eliminar un ciclo si `totalEjecuciones === 0`.

### Modal de Ejecución (en Casos de Prueba)
- Cuando resultado = `Fallido`: aparece el bloque "Datos del Defecto" con todos los campos para crear el defecto inline.
- Campo "Evidencia (URL)": cuando resultado ≠ Fallido se muestra antes del bloque; cuando = Fallido se mueve al final del bloque de defecto.
- Al guardar con Fallido: crea la ejecución, luego crea el defecto; muestra pantalla de éxito con código `INC-XXX`.
- El ciclo activo se muestra en un banner verde dentro del modal.

### Defectos
- Código global: `DEF-XXXX` (auto-incremento total). Código de proyecto: `INC-XXX` (por proyecto).
- La grilla de defectos muestra `codigoProyecto` (INC-XXX) en la columna "Defecto".
- El defecto recién creado se auto-vincula a la última ejecución `Fallido` sin defecto para ese caso.

### Proyectos (filtrado por usuario)
- Non-admin: solo ven proyectos donde son `jefe_proyecto`, `jefe_qa`, `responsable_qa`, o tienen casos/defectos asignados.
- Implementado en el backend — el frontend no necesita cambios especiales.

---

## Estados de Entidades

### Proyecto
`Activo → En Pausa → Completado` | `Activo → Inactivo`

### Ciclo de Prueba
`Activo → Cerrado` | `Cerrado → Activo` (reabrir)

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
