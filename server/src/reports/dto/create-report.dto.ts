import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';

class ShareDto {
  @IsString()
  @IsNotEmpty()
  x: string;

  @IsString()
  @IsNotEmpty()
  y: string;
}

class MatchingDto {
  @IsString()
  @IsNotEmpty()
  tag: string;

  @ValidateNested()
  @Type(() => ShareDto)
  share: ShareDto;
}

class EncryptedBlobDto {
  /** base64 — 12바이트 IV ∥ AES-GCM 암호문 */
  @IsString()
  @IsNotEmpty()
  C: string;

  /** base64 — RSA-OAEP로 래핑된 AES 키 */
  @IsString()
  @IsNotEmpty()
  encryptedK: string;
}

export class CreateReportDto {
  @ValidateNested()
  @Type(() => MatchingDto)
  matching: MatchingDto;

  /** 사건 내용 암호문 — 서버가 복호화하지 않음 */
  @ValidateNested()
  @Type(() => EncryptedBlobDto)
  incident: EncryptedBlobDto;

  /** 신고자 연락처 암호문 — 서버가 복호화하지 않음 */
  @ValidateNested()
  @Type(() => EncryptedBlobDto)
  reporterContact: EncryptedBlobDto;
}
