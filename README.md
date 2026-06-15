# Sistema QA

Sistema de gestión de calidad para proyectos de software. Permite administrar proyectos, requerimientos, casos de prueba y defectos con control de acceso por roles.

## Tabla de Contenidos

- [Características](#características)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Modelos de Datos](#modelos-de-datos)
- [Roles de Usuario](#roles-de-usuario)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Uso](#uso)
- [Variables de Entorno](#variables-de-entorno)
- [API Backend](#api-backend)

---

## Características

- Gestión de **Proyectos** con estados y responsables
- Gestión de **Requerimientos** por proyecto con criterios de aceptación
- Creación y ejecución de **Casos de Prueba** con pasos detallados
- Reporte y seguimiento de **Defectos** asociados a casos de prueba
- **Control de acceso por roles** (Admin, QA Lead, QA Tester, Developer, Project Manager)
- **Paginación y filtros** en todos los listados
- **Autenticación JWT** con interceptor automático
- Lazy loading por módulo de feature
- Angular 18 con componentes standalone y signals

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── core/
│   │   ├── models/              # Interfaces y enums de dominio
│   │   │   ├── user.model.ts
│   │   │   ├── project.model.ts
│   │   │   ├── requirement.model.ts
│   │   │   ├── test-case.model.ts
│   │   │   ├── defect.model.ts
│   │   │   └── index.ts
│   │   ├── services/            # Servicios HTTP
│   │   │   ├── auth.service.ts
│   │   │   ├── project.service.ts
│   │   │   ├── requirement.service.ts
│   │   │   ├── test-case.service.ts
│   │   │   ├── defect.service.ts
│   │   │   └── user.service.ts
│   │   ├── guards/              # Guards de ruta
│   │   │   ├── auth.guard.ts
│   │   │   └── role.guard.ts
│   │   └── interceptors/
│   │       └── auth.interceptor.ts
│   │
│   ├── features/                # Módulos de funcionalidad (lazy loaded)
│   │   ├── auth/login/
│   │   ├── projects/            # CRUD Proyectos
│   │   ├── requirements/        # CRUD Requerimientos
│   │   ├── test-cases/          # CRUD Casos de Prueba
│   │   ├── defects/             # CRUD Defectos
│   │   └── users/               # CRUD Usuarios (solo Admin)
│   │
│   ├── layout/                  # Header y Sidebar
│   ├── app.component.ts
│   ├── app.routes.ts
│   └── app.config.ts
│
├── environments/
│   ├── environment.ts           # Desarrollo (localhost:3000)
│   └── environment.prod.ts      # Producción (/api)
└── styles.scss                  # Estilos globales
```

---

## Modelos de Datos

### Proyectos (`Proyecto`)

| Campo           | Tipo               | Descripción                        |
|-----------------|--------------------|------------------------------------|
| id              | number             | Identificador único                |
| nombre          | string             | Nombre del proyecto                |
| codigo          | string             | Código corto (ej: PROJ-01)         |
| descripcion     | string             | Descripción detallada              |
| fechaInicio     | Date               | Fecha de inicio                    |
| fechaFin        | Date?              | Fecha de fin estimada              |
| estado          | EstadoProyecto     | Activo / Inactivo / Completado / En Pausa |
| responsableId   | number             | FK → Usuarios                      |
| creadoPor       | number             | FK → Usuarios                      |
| creadoEn        | Date               | Timestamp de creación              |
| actualizadoEn   | Date               | Timestamp de última modificación   |

### Requerimientos (`Requerimiento`)

| Campo                | Tipo                   | Descripción                     |
|----------------------|------------------------|---------------------------------|
| id                   | number                 | Identificador único             |
| proyectoId           | number                 | FK → Proyectos                  |
| codigo               | string                 | Código (ej: REQ-001)            |
| titulo               | string                 | Título del requerimiento        |
| descripcion          | string                 | Descripción completa            |
| criteriosAceptacion  | string                 | Criterios en formato BDD        |
| tipo                 | TipoRequerimiento      | Funcional / No Funcional / Negocio / Técnico |
| prioridad            | PrioridadRequerimiento | Crítica / Alta / Media / Baja   |
| estado               | EstadoRequerimiento    | Pendiente / En Análisis / Aprobado / ... |
| creadoPor            | number                 | FK → Usuarios                   |

### Casos de Prueba (`CasoPrueba`)

| Campo             | Tipo               | Descripción                          |
|-------------------|--------------------|--------------------------------------|
| id                | number             | Identificador único                  |
| proyectoId        | number             | FK → Proyectos                       |
| requerimientoId   | number?            | FK → Requerimientos (opcional)       |
| codigo            | string             | Código (ej: TC-001)                  |
| titulo            | string             | Título del caso                      |
| descripcion       | string             | Descripción                          |
| precondiciones    | string             | Estado previo requerido              |
| pasos             | PasoPrueba[]       | Lista ordenada de pasos con resultado esperado |
| resultadoEsperado | string             | Resultado general esperado           |
| tipo              | TipoCasoPrueba     | Funcional / Regresión / Humo / ...   |
| prioridad         | PrioridadCasoPrueba| Alta / Media / Baja                  |
| estado            | EstadoCasoPrueba   | Pendiente / En Ejecución / Aprobado / Fallido / Bloqueado |
| asignadoA         | number?            | FK → Usuarios                        |

### Defectos (`Defecto`)

| Campo              | Tipo            | Descripción                         |
|--------------------|-----------------|-------------------------------------|
| id                 | number          | Identificador único                 |
| proyectoId         | number          | FK → Proyectos                      |
| casoPruebaId       | number          | FK → Casos de Prueba                |
| codigo             | string          | Código (ej: DEF-001)                |
| titulo             | string          | Título del defecto                  |
| descripcion        | string          | Descripción detallada               |
| pasosReproduccion  | string          | Pasos para reproducir el defecto    |
| resultadoObtenido  | string          | Resultado actual (comportamiento)   |
| resultadoEsperado  | string          | Comportamiento esperado             |
| ambiente           | AmbienteDefecto | Desarrollo / QA / Staging / Producción |
| version            | string          | Versión del sistema afectado        |
| severidad          | SeveridadDefecto| Crítico / Alto / Medio / Bajo       |
| prioridad          | PrioridadDefecto| Urgente / Alta / Media / Baja       |
| estado             | EstadoDefecto   | Nuevo / Asignado / En Progreso / Resuelto / Cerrado / Reabierto |
| asignadoA          | number?         | FK → Usuarios (desarrollador)       |
| reportadoPor       | number          | FK → Usuarios (tester)              |
| fechaResolucion    | Date?           | Fecha en que se resolvió            |

### Usuarios (`Usuario`)

| Campo         | Tipo    | Descripción                    |
|---------------|---------|--------------------------------|
| id            | number  | Identificador único            |
| nombre        | string  | Nombre                         |
| apellido      | string  | Apellido                       |
| email         | string  | Correo electrónico (único)     |
| password      | string  | Contraseña (hash bcrypt)       |
| rol           | Rol     | Ver tabla de roles             |
| activo        | boolean | Estado del usuario             |
| creadoEn      | Date    | Timestamp de creación          |
| actualizadoEn | Date    | Timestamp de última modificación|

---

## Roles de Usuario

| Rol              | Proyectos | Requerimientos | Casos de Prueba | Defectos | Usuarios |
|------------------|-----------|----------------|-----------------|----------|----------|
| Administrador    | CRUD      | CRUD           | CRUD            | CRUD     | CRUD     |
| QA Lead          | Ver/Editar| CRUD           | CRUD            | CRUD     | Solo ver |
| QA Tester        | Ver       | Ver            | Ver/Editar      | Reportar | No       |
| Desarrollador    | Ver       | Ver            | Ver             | Ver/Resolver | No  |
| Project Manager  | CRUD      | Ver/Editar     | Ver             | Ver      | No       |

---

## Requisitos

- Node.js >= 18.x
- npm >= 9.x
- Angular CLI >= 18.x (`npm install -g @angular/cli`)
- Backend REST API corriendo en `http://localhost:3000` (ver sección API)

---

## Instalación

```bash
# Clonar el repositorio
git clone <url-repositorio>
cd sistema-qa

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start
```

La aplicación estará disponible en `http://localhost:4200`.

---

## Uso

```bash
# Desarrollo
npm start                # ng serve en localhost:4200

# Build producción
npm run build:prod       # Genera dist/sistema-qa/

# Tests
npm test                 # ng test (Karma + Jasmine)

# Lint
npm run lint
```

---

## Variables de Entorno

Modifica `src/environments/environment.ts` para desarrollo:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'  // URL de tu backend
};
```

---

## API Backend

El frontend consume una REST API que debe implementar los siguientes endpoints:

### Autenticación
```
POST   /api/auth/login
```

### Proyectos
```
GET    /api/proyectos              ?busqueda&estado&pagina&porPagina
GET    /api/proyectos/:id
GET    /api/proyectos/:id/resumen
POST   /api/proyectos
PUT    /api/proyectos/:id
DELETE /api/proyectos/:id
```

### Requerimientos
```
GET    /api/requerimientos         ?proyectoId&tipo&estado&busqueda&pagina
GET    /api/requerimientos/:id
GET    /api/proyectos/:id/requerimientos
POST   /api/requerimientos
PUT    /api/requerimientos/:id
DELETE /api/requerimientos/:id
```

### Casos de Prueba
```
GET    /api/casos-prueba           ?proyectoId&requerimientoId&estado&tipo
GET    /api/casos-prueba/:id
GET    /api/proyectos/:id/casos-prueba
POST   /api/casos-prueba
PUT    /api/casos-prueba/:id
DELETE /api/casos-prueba/:id
```

### Defectos
```
GET    /api/defectos               ?proyectoId&casoPruebaId&estado&severidad
GET    /api/defectos/:id
GET    /api/casos-prueba/:id/defectos
POST   /api/defectos
PUT    /api/defectos/:id
PATCH  /api/defectos/:id/estado
POST   /api/defectos/:id/comentarios
DELETE /api/defectos/:id
```

### Usuarios
```
GET    /api/usuarios               ?rol&activo&busqueda&pagina
GET    /api/usuarios/:id
POST   /api/usuarios
PUT    /api/usuarios/:id
PATCH  /api/usuarios/:id/estado
GET    /api/usuarios/:id/roles
POST   /api/usuarios/:id/roles
DELETE /api/usuarios/:id
```

Todos los endpoints paginados retornan:
```json
{
  "datos": [...],
  "total": 100,
  "pagina": 1,
  "porPagina": 15
}
```

---

## Flujo de Trabajo Típico

```
Proyecto → Requerimientos → Casos de Prueba → Ejecución → Defectos → Resolución
```

1. Se crea un **Proyecto** con su responsable
2. Se agregan **Requerimientos** al proyecto
3. Se crean **Casos de Prueba** vinculados a requerimientos
4. El QA ejecuta los casos y cambia su estado
5. Si un caso falla, se reporta un **Defecto** con severidad y prioridad
6. El defecto se asigna a un desarrollador para resolución
7. El QA verifica la corrección y cierra el defecto
