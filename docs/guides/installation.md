# Guía de Instalación

Esta guía te ayudará a configurar PinteYa! en tu entorno local de desarrollo.

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- Node.js (v18 o superior)
- pnpm (recomendado) o npm
- Git
- Un editor de código (recomendamos VS Code)
- Una cuenta en [Supabase](https://supabase.com)

## Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/SantiagoMartinezMm/pinteya-ecommerce.git
cd pinteya-ecommerce
```

## Paso 2: Instalar Dependencias

```bash
pnpm install
```

## Paso 3: Configurar Variables de Entorno

1. Copia el archivo de ejemplo:

   ```bash
   cp .env.example .env.local
   ```

2. Configura las siguientes variables en `.env.local`:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
   SUPABASE_SERVICE_ROLE_KEY=tu-clave-de-servicio

   # Autenticación
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=tu-secreto-seguro

   # Redis (opcional)
   REDIS_URL=tu-url-de-redis
   ```

## Paso 4: Configurar la Base de Datos

1. Crea un proyecto en Supabase
2. Ejecuta las migraciones:
   ```bash
   pnpm supabase db push
   ```

## Paso 5: Iniciar el Servidor de Desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

## Paso 6: Configurar el Editor

### VS Code

Recomendamos instalar las siguientes extensiones:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features

### Configuración Recomendada

Añade esto a tu `settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Solución de Problemas

### Error: Cannot find module...

- Ejecuta `pnpm install` nuevamente
- Verifica que estás usando la versión correcta de Node.js

### Error de conexión con Supabase

- Verifica tus credenciales en `.env.local`
- Asegúrate de que tu proyecto en Supabase esté activo

### Problemas con las migraciones

- Ejecuta `pnpm supabase db reset`
- Verifica los logs en la consola de Supabase

## Próximos Pasos

Una vez instalado, puedes:

1. [Explorar la guía de desarrollo](development.md)
2. [Configurar el entorno de pruebas](testing.md)
3. [Aprender sobre el despliegue](deployment.md)

## Soporte

Si encuentras algún problema durante la instalación:

1. Revisa los [problemas comunes](troubleshooting.md)
2. Busca en los [issues existentes](https://github.com/SantiagoMartinezMm/pinteya-ecommerce/issues)
3. Abre un nuevo issue si es necesario
