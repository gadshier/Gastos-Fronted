# Gastos Frontend (React + Vite)

Frontend para consumir tu API REST de gastos (`/api/gastos`) y ofrecer una experiencia visual moderna, responsive y escalable.

## Features incluidas

- Dashboard con métricas clave:
  - Total de gastos
  - Cantidad de registros
  - Categoría más usada
- Listado de gastos con tabla responsive
- Crear y editar gastos con formulario reutilizable
- Eliminar con confirmación modal
- Feedback visual (loading, errores, toasts)
- Estructura por componentes + servicios para API

## Configuración rápida

1. Instala dependencias:

```bash
npm install
```

2. Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_BASE_URL=https://localhost:44364/api
```

3. Ejecuta en desarrollo:

```bash
npm run dev
```

## Estructura de carpetas

```text
src/
  components/      # UI reutilizable (tabla, formulario, modal, tarjetas, toast)
  services/        # Cliente HTTP para la API
  utils/           # Formateadores de moneda/fecha
  App.jsx          # Orquestación principal (estado, flujos CRUD)
```

## Backend y CORS

Si el frontend corre en `http://localhost:5173` y el backend en `https://localhost:44364`, debes habilitar CORS en ASP.NET Web API.

Ejemplo mínimo (WebApiConfig):

```csharp
using System.Web.Http;
using System.Web.Http.Cors;

public static class WebApiConfig
{
    public static void Register(HttpConfiguration config)
    {
        var cors = new EnableCorsAttribute("http://localhost:5173", "*", "*");
        config.EnableCors(cors);

        config.MapHttpAttributeRoutes();
        config.Routes.MapHttpRoute(
            name: "DefaultApi",
            routeTemplate: "api/{controller}/{id}",
            defaults: new { id = RouteParameter.Optional }
        );
    }
}
```

> Recomendación: en producción, reemplaza `*` por orígenes y headers específicos.

## Librerías sugeridas (opcionales, no obligatorias)

- `axios` para interceptores y manejo centralizado de errores.
- `react-hook-form` para formularios más robustos.
- `zod` para validación declarativa.
- `lucide-react` para iconografía consistente.

La base actual ya funciona sin estas librerías para mantener la complejidad baja.
