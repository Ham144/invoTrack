import { Injectable, NestMiddleware } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { PrismaService } from 'src/common/prisma.service';
import { createHash } from 'crypto';
import { ROLE } from 'src/common/shared-enum';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

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

    let access_token = req?.cookies?.['access_token'];

    // Check for Authorization Header if Cookie is missing
    if (!access_token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token) {
          if (token.includes('.')) {
            // Probably a JWT token
            access_token = token;
          } else {
            // Verify if it is a registered Agent Device token
            try {
              const tokenHash = createHash('sha256').update(token).digest('hex');
              const device = await this.prisma.agentDevice.findFirst({
                where: { deviceTokenHash: tokenHash },
                include: {
                  workstation: { select: { isActive: true } },
                },
              });

              if (device && device.pairedAt && device.workstation.isActive) {
                // Simulate req.user with OPERATOR role for the workstation's organization
                req.user = {
                  username: `agent_${device.workstationId}`,
                  role: ROLE.OPERATOR,
                  organizationName: device.organizationName,
                } as TokenPayload;
                return next();
              }
            } catch (err) {
              // Ignore DB lookup error and let it fall through to 401
            }
          }
        }
      }
    }

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
