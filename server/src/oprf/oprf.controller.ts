import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { IsHexadecimal, IsString, Length } from 'class-validator';
import { OprfService } from './oprf.service';

class OprfRequestDto {
  /** 클라이언트가 블라인딩한 Ristretto255 점 — 32바이트 = 64자리 hex */
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  blinded!: string;
}

@Controller('oprf')
export class OprfController {
  constructor(private readonly oprfService: OprfService) {}

  /**
   * POST /oprf
   * 블라인딩된 점을 받아 서버 비밀키로 연산한 결과를 반환한다.
   * 서버는 입력 원문도, 최종 K도 알 수 없다.
   */
  @Post()
  evaluate(@Body() dto: OprfRequestDto): { response: string } {
    try {
      return { response: this.oprfService.evaluate(dto.blinded) };
    } catch {
      throw new BadRequestException('유효하지 않은 Ristretto255 점입니다');
    }
  }
}
