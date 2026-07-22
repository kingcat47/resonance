import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class OprfService implements OnModuleInit {
  private readonly logger = new Logger(OprfService.name);
  private oprf: {
    blind: (input: Uint8Array) => { blind: Uint8Array; blinded: Uint8Array };
    blindEvaluate: (key: Uint8Array, blinded: Uint8Array) => Uint8Array;
    finalize: (input: Uint8Array, blind: Uint8Array, evaluated: Uint8Array) => Uint8Array;
  };
  private bytesToHex: (bytes: Uint8Array) => string;
  private hexToBytes: (hex: string) => Uint8Array;
  private secretKey: Uint8Array;

  async onModuleInit(): Promise<void> {
    // CommonJS + ESM 패키지 호환: 동적 import 사용
    const curves = await import('@noble/curves/ed25519.js');
    const hashes = await import('@noble/hashes/utils.js');

    this.oprf = curves.ristretto255_oprf.oprf;
    this.bytesToHex = hashes.bytesToHex;
    this.hexToBytes = hashes.hexToBytes;

    const hex = process.env.OPRF_SECRET_KEY ?? '';
    if (hex.length !== 64) {
      throw new Error(
        'OPRF_SECRET_KEY가 설정되지 않았거나 형식이 잘못됐습니다. 64자리 hex 문자열(32바이트)이 필요합니다.',
      );
    }
    this.secretKey = this.hexToBytes(hex);
    this.logger.log('OPRF 서비스 초기화 완료');
  }

  evaluate(blindedHex: string): string {
    const blinded = this.hexToBytes(blindedHex);
    const evaluated = this.oprf.blindEvaluate(this.secretKey, blinded);
    return this.bytesToHex(evaluated);
  }
}
