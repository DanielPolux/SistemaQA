# CLAUDE.md — Sistema QA

Guía de contexto para Claude Code al trabajar en este proyecto.

## Resumen del Proyecto

**Sistema QA** es una aplicación Angular 18 para gestión de calidad de software. Maneja proyectos, requerimientos, casos de prueba y defectos con autenticación JWT y control de acceso por roles.

**Stack:** Angular 18 (standalone components + signals) · TypeScript strict · SCSS · REST API

---

## Arquitectura

```
src/app/
├── core/           # Singleton: modelos, servicios HTTP, guards, interceptors
├── features/       # Lazy-loaded por ruta: auth, projects, requirements, test-cases, defects, users
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
- Usar `loadComponent` y `loadChildren` para lazy loading — no importar componentes directamente en rutas.

### Modelos
- Todos los tipos viven en `src/app/core/models/`, re-exportados desde `index.ts`.
- Siempre importar desde `'../../../core/models'` (barrel), no desde archivos individuales.
- Los enums usan valores en español (los mismos que muestra la UI).

### Formularios
- Usar **Reactive Forms** (`FormBuilder`, `FormGroup`, `FormArray`).
- Validación con `Validators` de Angular — no validación custom en templates.
- El componente de formulario determina crear vs. editar según si `casoId`/`proyectoId`/etc. es `undefined`.

---

## Relaciones entre Entidades

```
Proyecto (1) ──────────────── (N) Requerimiento
Proyecto (1) ──────────────── (N) Caso de Prueba
Requerimiento (1) ──────────── (N) Caso de Prueba  [opcional]
Caso de Prueba (1) ─────────── (N) Defecto
Usuario (1) ────────────────── (N) Proyecto [como responsable]
Usuario (1) ────────────────── (N) Caso de Prueba [asignado]
Usuario (1) ────────────────── (N) Defecto [asignado / reportado]
```

---

## Roles y Permisos

| Rol              | Enum value          | Alcance                                  |
|------------------|---------------------|------------------------------------------|
| `Administrador`  | `Rol.ADMIN`         | Acceso total incluido gestión de usuarios|
| `QA Lead`        | `Rol.QA_LEAD`       | CRUD en requerimientos, casos, defectos  |
| `QA Tester`      | `Rol.QA_TESTER`     | Ejecutar casos y reportar defectos       |
| `Desarrollador`  | `Rol.DEVELOPER`     | Ver y resolver defectos asignados        |
| `Project Manager`| `Rol.PROJECT_MANAGER`| CRUD proyectos, ver resto               |

El guard `roleGuard(rolesPermitidos)` es una función que retorna `CanActivateFn` — se usa en rutas específicas dentro de `*.routes.ts`.

---

## Estados de Entidades

### Proyecto
`Activo → En Pausa → Completado` | `Activo → Inactivo`

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
- Clases de utilidad definidas globalmente: `.btn`, `.badge`, `.data-table`, `.form-group`, `.page-container`, `.stats-grid`.
- **No crear archivos `.scss` por componente** a menos que el componente tenga estilos muy específicos y extensos.
- Las clases `.badge-*` se construyen dinámicamente con el valor del enum en minúsculas (ej: `badge-crítico` para severidad Crítico). Agregar esos estilos en `styles.scss` si se necesitan colores específicos.

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

---

## Agregar una Nueva Feature

1. Crear directorio en `src/app/features/<nombre>/`
2. Crear `<nombre>.routes.ts` con las rutas lazy del feature
3. Agregar la ruta en `src/app/app.routes.ts` con `loadChildren`
4. Crear modelos en `core/models/` si son nuevos y exportarlos desde `index.ts`
5. Crear servicio en `core/services/` con métodos CRUD estándar
6. Crear componentes list + form siguiendo el patrón existente

---

## Variables de Entorno

| Variable        | Desarrollo              | Producción |
|-----------------|-------------------------|------------|
| `apiUrl`        | `http://localhost:3000/api` | `/api` |
| `production`    | `false`                 | `true`     |

Modificar `src/environments/environment.ts` para desarrollo local.
