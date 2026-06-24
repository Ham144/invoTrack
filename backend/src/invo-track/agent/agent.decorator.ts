import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export interface AgentContext {
  deviceId: string;
  workstationId: string;
  organizationName: string;
}

export const AgentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AgentContext => {
    const request = ctx.switchToHttp().getRequest();
    const agent = request.agent as AgentContext | undefined;
    if (!agent) {
      throw new UnauthorizedException('Agent tidak terautentikasi');
    }
    return agent;
  },
);
