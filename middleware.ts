import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/services/session-manager';
import { TokenManager } from '@/lib/auth/token-manager';
import { RateLimiter } from '@/lib/services/rate-limiter';
import { SecurityLogger } from '@/lib/services/security-logger';

const sessionManager = new SessionManager();
const tokenManager = new TokenManager();
const rateLimiter = RateLimiter.getInstance();
const securityLogger = SecurityLogger.getInstance();

export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const path = request.nextUrl.pathname;

  // Rate limiting
  if (!await rateLimiter.checkLimit(`${ip}:${path}`)) {
    await securityLogger.logEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      ip,
      path,
      timestamp: new Date()
    });
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  // CSRF Protection para mutaciones
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfToken = request.headers.get('x-csrf-token');
    if (!await tokenManager.validateCSRFToken(csrfToken)) {
      await securityLogger.logEvent({
        type: 'CSRF_VALIDATION_FAILED',
        ip,
        path,
        timestamp: new Date()
      });
      return new NextResponse('Invalid CSRF Token', { status: 403 });
    }
  }

  // Rutas públicas que no requieren autenticación
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/api/auth',
    '/productos',
    '/categorias'
  ];

  // Verificar si la ruta actual es pública
  if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
    return NextResponse.next();
  }

  const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Autenticación requerida para rutas protegidas
  if (!session) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const decoded = await tokenManager.verifyToken(session.access_token);
    const sessionData = await sessionManager.validateSession(decoded.sessionId);

    if (!sessionData) {
      throw new Error('Invalid session');
    }

    // Validación de permisos
    const hasPermission = await validatePermissions(
      decoded.userId,
      decoded.role,
      path,
      request.method
    );

    if (!hasPermission) {
      await securityLogger.logEvent({
        type: 'PERMISSION_DENIED',
        userId: decoded.userId,
        ip,
        path,
        timestamp: new Date()
      });
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Actualizar headers con información del usuario
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', decoded.role);
    requestHeaders.set('x-session-id', decoded.sessionId);

    // Logging
    await securityLogger.logAccess({
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      ip,
      path,
      method: request.method,
      timestamp: new Date()
    });

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    await securityLogger.logEvent({
      type: 'AUTH_FAILED',
      ip,
      path,
      error: error.message,
      timestamp: new Date()
    });
    return new NextResponse('Authentication Failed', { status: 401 });
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
