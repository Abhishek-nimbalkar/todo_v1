import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcryptjs';
import { CreateAuthDto } from './dto/create-auth.dto';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly redisClient: Redis;
  private readonly jwtSecret: string;
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.redisClient = new Redis();
    this.jwtSecret = this.configService.get('JWT_SECRET');
  }
  async login(loginData: CreateAuthDto): Promise<any> {
    try {
      const user = await this.userService.findOne(loginData.username);
      if (user && (await bcrypt.compare(loginData.password, user.password))) {
        const payload = { username: user.username, sub: user._id };
        const token = this.jwtService.sign(payload, {
          expiresIn: '1h',
          secret: this.jwtSecret,
        });

        // Delete old token from Redis
        await this.redisClient.del(user.username);

        // Set new token in Redis
        await this.redisClient.set(user.username, token);
        return { success: true, token: 'Bearer ' + token };
      }
      return { success: false, message: 'Invalid username or password' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async signUp(signUpData: CreateAuthDto) {
    try {
      const hashedPassword = await bcrypt.hash(signUpData.password, 10);
      const user = await this.userService.create(
        signUpData.username,
        hashedPassword,
      );
      return { success: true, user: user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getTokenFromRedis(username: string): Promise<any> {
    try {
      const token = await this.redisClient.get(username);
      return { success: true, token: token };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
