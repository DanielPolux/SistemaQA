# Sistema QA — Frontend

Aplicación Angular 18 para gestión de calidad de software. Permite administrar proyectos, requerimientos, casos de prueba, ciclos de prueba, ejecuciones, defectos y planes de prueba con control de acceso por roles.

---

## Características

- Gestión de **Proyectos** con estados y múltiples responsables (jefe de proyecto, jefe QA, responsable QA)
- Gestión de **Requerimientos** por proyecto con criterios de aceptación
- Creación y ejecución de **Casos de Prueba** con pasos detallados e historial de auditoría
- **Ciclos de Prueba** por proyecto — agrupan ejecuciones; se asignan automáticamente al registrar; solo puede haber uno activo por proyecto
- **Ejecuciones** con creación inline de defecto cuando el resultado es `Fallido`
- Reporte y seguimiento de **Defectos** con códigos globales (`DEF-XXXX`) y por proyecto (`INC-XXX`); filtro por proyecto, severidad y estado
- **Planes de Prueba** con agrupación de ciclos, estado del plan y **Matriz de Trazabilidad** (req → caso → resultado)
- **Exportación a Word** (.docx) para defectos individuales y matrices de trazabilidad de planes
- **Dashboard con estado vacío** — muestra mensaje diferenciado según rol cuando el usuario no tiene proyectos asignados
- **Filtrado por usuario** — non-admin solo ve los datos de proyectos en los que participa (todos los módulos)
- **Control de acceso por roles** (Admin, QA Lead, QA Tester, Developer, Project Manager)
- **Paginación** con botones Anterior/Siguiente en todos los listados y corrección automática de página vacía
- **Autenticación JWT** con interceptor automático

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
│   ├── models/                  # Interfaces y enums de dominio
│   │   ├── project.model.ts
│   │   ├── requirement.model.ts
│   │   ├── test-case.model.ts
│   │   ├── defect.model.ts
│   │   ├── ejecucion.model.ts
│   │   ├── ciclo-prueba.model.ts
│   │   ├── plan-prueba.model.ts
│   │   ├── user.model.ts
│   │   └── index.ts             # Re-exporta todos los modelos
│   ├── services/                # Servicios HTTP
│   │   ├── auth.service.ts
│   │   ├── project.service.ts
│   │   ├── requirement.service.ts
│   │   ├── test-case.service.ts
│   │   ├── defect.service.ts
│   │   ├── ejecucion.service.ts
│   │   ├── ciclo.service.ts
│   │   ├── plan-prueba.service.ts
│   │   ├── user.service.ts
│   │   ├── auditoria.service.ts
│   │   ├── word-export.service.ts        # Export Word para defectos
│   │   ├── word-export-plan.service.ts   # Export Word para trazabilidad
│   │   └── word-export.helpers.ts        # Utilidades compartidas DOCX
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── role.guard.ts
│   └── interceptors/
│       └── auth.interceptor.ts
│
├── features/
│   ├── auth/login/
│   ├── projects/                # Lista + formulario de proyectos
│   ├── requirements/            # Lista + formulario de requerimientos
│   ├── test-cases/              # Lista (modal ejecutar + ver + editar) + formulario
│   ├── ciclos/                  # Lista + formulario de ciclos de prueba
│   ├── ejecuciones/             # Lista con modal Ver detalle
│   ├── defects/                 # Lista + formulario de defectos
│   ├── planes-prueba/           # Lista + formulario + detalle + trazabilidad
│   │   └── trazabilidad/        # Matriz req → caso → resultado con export Word/CSV
│   ├── users/                   # CRUD usuarios (solo Admin)
│   ├── catalogos/               # Catálogos (solo Admin)
│   └── dashboard/               # Métricas, gráficos y estado vacío por usuario
│
└── layout/
    ├── header/
    └── sidebar/                 # Menú lateral con visibilidad por rol
```

---

## Rutas principales

| Ruta | Acceso | Descripción |
|---|---|---|
| `/auth/login` | Público | Login |
| `/dashboard` | Todos | Métricas del sistema (datos filtrados por usuario) |
| `/proyectos` | No Developer | Lista y gestión de proyectos |
| `/requerimientos` | No Developer | Lista y gestión de requerimientos |
| `/casos-prueba` | No Developer | Lista, ejecución y gestión de casos |
| `/ciclos` | QA Lead / PM / Admin | Gestión de ciclos de prueba |
| `/ejecuciones` | No Developer | Historial de ejecuciones |
| `/defectos` | Todos | Lista y gestión de defectos |
| `/planes-prueba` | QA Lead / PM / Admin | Gestión de planes de prueba |
| `/planes-prueba/:id/trazabilidad` | QA Lead / PM / Admin | Matriz de trazabilidad |
| `/usuarios` | Admin | Gestión de usuarios |
| `/catalogos` | Admin | Catálogos del sistema |

---

## Flujo de Trabajo

```
Proyecto → [Plan de Pruebas] → Ciclo de Prueba → Casos de Prueba → Ejecutar → [Fallido → Defecto] → Resolución
```

1. Se crea un **Proyecto** con sus responsables
2. Opcionalmente se crea un **Plan de Pruebas** para agrupar ciclos
3. Se abre un **Ciclo de Prueba** activo para el proyecto (solo uno a la vez por proyecto)
4. Se crean **Casos de Prueba** vinculados a requerimientos
5. El QA ejecuta los casos desde la grilla; el ciclo activo se asigna automáticamente
6. Si el resultado es **Fallido**, se completan los campos del defecto en el mismo modal
7. Se crea la ejecución y el defecto en una sola acción; se muestra el código `INC-XXX`
8. El defecto se asigna a un desarrollador para resolución
9. El QA verifica la corrección y cierra el defecto
10. La **Matriz de Trazabilidad** del plan muestra la cobertura req → caso → resultado

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

GET    /api/casos-prueba           ?proyectoId&requerimientoId&estado&tipo&resultado&busqueda&pagina
GET    /api/casos-prueba/:id
POST   /api/casos-prueba
PUT    /api/casos-prueba/:id
DELETE /api/casos-prueba/:id

GET    /api/ciclos-prueba          ?proyectoId&estado&pagina&porPagina
GET    /api/ciclos-prueba/activo/:proyectoId
GET    /api/ciclos-prueba/casos-previos/:proyectoId
GET    /api/ciclos-prueba/:id/casos
GET    /api/ciclos-prueba/:id
POST   /api/ciclos-prueba
PUT    /api/ciclos-prueba/:id
PATCH  /api/ciclos-prueba/:id/cerrar
PATCH  /api/ciclos-prueba/:id/reabrir
DELETE /api/ciclos-prueba/:id

GET    /api/ejecuciones            ?proyectoId&resultado&ambiente&testerId&pagina
POST   /api/ejecuciones
GET    /api/ejecuciones/caso-prueba/:id

GET    /api/defectos               ?proyectoId&casoPruebaId&estado&severidad&pagina
GET    /api/defectos/:id
POST   /api/defectos
PUT    /api/defectos/:id
PATCH  /api/defectos/:id/estado
POST   /api/defectos/:id/comentarios
DELETE /api/defectos/:id

GET    /api/planes-prueba          ?proyectoId&estado&pagina&porPagina
GET    /api/planes-prueba/:id
GET    /api/planes-prueba/:id/trazabilidad
POST   /api/planes-prueba
PUT    /api/planes-prueba/:id
PATCH  /api/planes-prueba/:id/cerrar
PATCH  /api/planes-prueba/:id/reabrir
DELETE /api/planes-prueba/:id

GET    /api/usuarios               ?rol&activo&busqueda&pagina
POST   /api/usuarios
PUT    /api/usuarios/:id
PATCH  /api/usuarios/:id/estado
DELETE /api/usuarios/:id

GET    /api/dashboard/stats
```

Todos los endpoints paginados retornan:
```json
{ "datos": [...], "total": 100, "pagina": 1, "porPagina": 15 }
```
