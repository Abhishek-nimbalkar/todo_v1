import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../decorator/public.decorator';
import Redis from 'ioredis';

@Injectable()
export class AuthGuard implements CanActivate {
  private jwtSecret: string;
  private readonly redisClient: Redis;
  constructor(
    private jwtService: JwtService,
    configService: ConfigService,
    private reflector: Reflector,
  ) {
    this.jwtSecret = configService.get('JWT_SECRET');
    this.redisClient = new Redis();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // 💡 See this condition
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    // console.log('token :>> ', token);
    if (!token) {
      throw new UnauthorizedException('Token Missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtSecret,
      });
      // const decoded = this.jwtService.verify(token);
      const redisToken = await this.redisClient.get(payload.username);

      if (token !== redisToken) {
        console.log('object');
        throw new UnauthorizedException({
          success: false,
          message: 'Session expired',
        });
      }
      request['user'] = payload;
    } catch (err) {
      if (err.response.message === 'Session expired') throw err;
      throw new UnauthorizedException('Invalid Token');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
