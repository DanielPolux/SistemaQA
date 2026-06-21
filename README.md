# Sistema QA — Frontend

Aplicación Angular 18 para gestión de calidad de software. Permite administrar proyectos, requerimientos, casos de prueba, ciclos de prueba, ejecuciones y defectos con control de acceso por roles.

---

## Características

- Gestión de **Proyectos** con estados y múltiples responsables (jefe de proyecto, jefe QA, responsable QA)
- Gestión de **Requerimientos** por proyecto con criterios de aceptación
- Creación y ejecución de **Casos de Prueba** con pasos detallados e historial de auditoría
- **Ciclos de Prueba** por proyecto — agrupan ejecuciones; se asignan automáticamente al registrar
- **Ejecuciones** con creación inline de defecto cuando el resultado es `Fallido`
- Reporte y seguimiento de **Defectos** con códigos globales (`DEF-XXXX`) y por proyecto (`INC-XXX`)
- **Control de acceso por roles** (Admin, QA Lead, QA Tester, Developer, Project Manager)
- **Filtrado de proyectos por usuario** — cada usuario solo ve los proyectos en los que participa
- **Paginación y filtros** en todos los listados
- **Autenticación JWT** con interceptor automático
- Angular 18 con componentes standalone y signals

---

## Requisitos

- Node.js >= 18.x
- npm >= 9.x
- Angular CLI >= 18.x (`npm install -g @angular/cli`)
- Backend REST API corriendo en `http://localhost:3000` (ver `SistemaQA-Backend/`)

---

## Instalación y Uso

```bash
npm install

npm start              # Dev server → http://localhost:4200
npm run build:prod     # Build producción → dist/sistema-qa/
npm test               # Tests unitarios (Karma + Jasmine)
npm run lint           # ESLint
```

---

## Estructura

```
src/app/
├── core/
│   ├── models/              # Interfaces y enums de dominio
│   │   ├── project.model.ts
│   │   ├── requirement.model.ts
│   │   ├── test-case.model.ts
│   │   ├── defect.model.ts
│   │   ├── ejecucion.model.ts
│   │   ├── ciclo-prueba.model.ts
│   │   ├── user.model.ts
│   │   └── index.ts         # Re-exporta todos los modelos
│   ├── services/            # Servicios HTTP
│   │   ├── auth.service.ts
│   │   ├── project.service.ts
│   │   ├── requirement.service.ts
│   │   ├── test-case.service.ts
│   │   ├── defect.service.ts
│   │   ├── ejecucion.service.ts
│   │   ├── ciclo.service.ts
│   │   ├── user.service.ts
│   │   └── auditoria.service.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── role.guard.ts
│   └── interceptors/
│       └── auth.interceptor.ts
│
├── features/
│   ├── auth/login/
│   ├── projects/            # Lista + formulario de proyectos
│   ├── requirements/        # Lista + formulario de requerimientos
│   ├── test-cases/          # Lista (con modal ejecutar + ver + editar) + formulario
│   ├── ciclos/              # Lista + formulario de ciclos de prueba
│   ├── ejecuciones/         # Lista con modal Ver detalle
│   ├── defects/             # Lista + formulario de defectos
│   ├── users/               # CRUD usuarios (solo Admin)
│   ├── catalogos/           # Catálogos (solo Admin)
│   └── dashboard/           # Métricas y gráficos
│
└── layout/
    ├── header/
    └── sidebar/             # Menú lateral con visibilidad por rol
```

---

## Rutas principales

| Ruta | Acceso | Descripción |
|---|---|---|
| `/auth/login` | Público | Login |
| `/dashboard` | Todos | Métricas del sistema |
| `/proyectos` | No Developer | Lista y gestión de proyectos |
| `/requerimientos` | No Developer | Lista y gestión de requerimientos |
| `/casos-prueba` | No Developer | Lista, ejecución y gestión de casos |
| `/ciclos` | QA Lead / PM / Admin | Gestión de ciclos de prueba |
| `/ejecuciones` | No Developer | Historial de ejecuciones |
| `/defectos` | Todos | Lista y gestión de defectos |
| `/usuarios` | Admin | Gestión de usuarios |
| `/catalogos` | Admin | Catálogos del sistema |

---

## Flujo de Trabajo

```
Proyecto → Ciclo de Prueba → Casos de Prueba → Ejecutar → [Fallido → Defecto] → Resolución
```

1. Se crea un **Proyecto** con sus responsables
2. Se abre un **Ciclo de Prueba** activo para el proyecto
3. Se crean **Casos de Prueba** vinculados a requerimientos
4. El QA ejecuta los casos desde la grilla; el ciclo se asigna automáticamente
5. Si el resultado es **Fallido**, se completan los campos del defecto en el mismo modal
6. Se crea la ejecución y el defecto en una sola acción; se muestra el código `INC-XXX`
7. El defecto se asigna a un desarrollador para resolución
8. El QA verifica la corrección y cierra el defecto

---

## Variables de Entorno

Modifica `src/environments/environment.ts` para desarrollo:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

---

## API Consumida

### Endpoints principales

```
POST   /api/auth/login

GET    /api/proyectos              ?busqueda&estado&pagina&porPagina
GET    /api/proyectos/:id
POST   /api/proyectos
PUT    /api/proyectos/:id
DELETE /api/proyectos/:id

GET    /api/requerimientos         ?proyectoId&tipo&estado&busqueda&pagina
GET    /api/requerimientos/:id
POST   /api/requerimientos
PUT    /api/requerimientos/:id
DELETE /api/requerimientos/:id

GET    /api/casos-prueba           ?proyectoId&requerimientoId&estado&tipo&resultado
GET    /api/casos-prueba/:id
POST   /api/casos-prueba
PUT    /api/casos-prueba/:id
DELETE /api/casos-prueba/:id

GET    /api/ciclos-prueba          ?proyectoId&estado&pagina&porPagina
GET    /api/ciclos-prueba/activo/:proyectoId
GET    /api/ciclos-prueba/:id
POST   /api/ciclos-prueba
PUT    /api/ciclos-prueba/:id
PATCH  /api/ciclos-prueba/:id/cerrar
PATCH  /api/ciclos-prueba/:id/reabrir
DELETE /api/ciclos-prueba/:id

GET    /api/ejecuciones            ?proyectoId&resultado&ambiente&testerId&pagina
POST   /api/ejecuciones
GET    /api/ejecuciones/caso-prueba/:id

GET    /api/defectos               ?proyectoId&casoPruebaId&estado&severidad
GET    /api/defectos/:id
GET    /api/defectos/siguiente-codigo/:proyectoId
POST   /api/defectos
PUT    /api/defectos/:id
PATCH  /api/defectos/:id/estado
POST   /api/defectos/:id/comentarios
DELETE /api/defectos/:id

GET    /api/usuarios               ?rol&activo&busqueda&pagina
POST   /api/usuarios
PUT    /api/usuarios/:id
PATCH  /api/usuarios/:id/estado
DELETE /api/usuarios/:id
```

Todos los endpoints paginados retornan:
```json
{ "datos": [...], "total": 100, "pagina": 1, "porPagina": 15 }
```
