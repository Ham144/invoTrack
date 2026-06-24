import { Injectable, NestMiddleware } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { TokenPayload } from 'src/user/dto/token-payload.dto';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  async use(req: any, res: any, next: (error?: Error | any) => void) {
    const publicRoutes = [
      '/api/user/login',
      '/api/user/refresh-token',
      '/api/organization/landing-page',
      '/api/agent/pair',
    ];

    // Agent API memakai Bearer device token (AgentAuthGuard), bukan cookie web
    if (req.originalUrl.startsWith('/api/agent')) {
      return next();
    }

    //refresh_token tidak akan melewati middleware ini
    if (publicRoutes.some((path) => req.originalUrl.startsWith(path))) {
      // Lewati middleware
      return next();
    }

    const access_token = req?.cookies?.['access_token'];

    if (!access_token) {
      return res.status(401).json({ message: 'Access token not found' });
    }

    try {
      // Verify web token
      const decoded = jwt.verify(
        access_token,
        process.env.JWT_SECRET,
      ) as TokenPayload;

      // Pastikan req.user ter-set dengan payload yang lengkap
      req.user = decoded;

      next();
    } catch (error) {
      // Jangan clear cookie di sini, biarkan frontend yang handle refresh
      // res.clearCookie('access_token', { path: '/' });
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }
}
