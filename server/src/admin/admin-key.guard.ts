import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * 데모용 관리자 키 가드.
 * 요청 헤더 x-admin-key 값을 환경변수 ADMIN_KEY와 비교한다.
 * 실제 배포 시에는 더 강력한 인증(JWT, mTLS 등)으로 교체해야 한다.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const provided = req.headers['x-admin-key'];
    const expected = process.env.ADMIN_KEY;

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('관리자 키가 올바르지 않습니다');
    }
    return true;
  }
}
