/**
 * 공명(Resonance) 신고 데이터 타입 정의
 *
 * 잠금 구조 개요:
 *  - MatchingData     → tag 잠금     : 가해자 태그를 만드는 재료. 서버가 매칭에만 사용하고 원문은 볼 수 없어야 함.
 *  - IncidentData     → 이중 잠금    : 사건 내용. 임계값 충족 전까지 아무도 열람 불가.
 *  - ReporterContact  → 신고자키 잠금: 신고자 신원. 본인 동의 전까지 누구도 열람 불가.
 */

// ---------------------------------------------------------------------------
// 1. MatchingData — tag 잠금
//    서버는 이 데이터를 해시/태그 형태로만 보고 원문은 볼 수 없다.
//    같은 시설·가해자를 2명 이상 지목하면 임계값 매칭이 트리거된다.
// ---------------------------------------------------------------------------
export interface MatchingData {
  /** 요양시설 고유 식별자 (예: 사업자 등록번호 또는 시설 코드) */
  facilityId: string;

  /** 가해자 이름. tag 생성 재료로만 쓰이고 서버에 평문 전달 금지 */
  perpetratorName: string;

  /** 가해자 직책/역할 (예: "요양보호사", "시설장"). 동명이인 구분 보조 */
  perpetratorRole: string;

  /** 가해자 추가 식별 정보 (선택). 외모·특징 등 자유 기술 */
  perpetratorDescription?: string;
}

// ---------------------------------------------------------------------------
// 2. IncidentData — 이중 잠금
//    사건의 구체적 내용. 임계값 매칭이 완료될 때까지 서버도 수신자도 열람 불가.
// ---------------------------------------------------------------------------
export interface IncidentData {
  /** 사건 발생 일시. 정확한 시각을 모를 경우 날짜만 입력 가능하도록 string */
  occurredAt: string;

  /** 사건 발생 장소 상세 (예: "3층 302호 욕실") */
  locationDetail: string;

  /** 사건 내용 자유 서술 */
  description: string;

  /** 첨부 증거 파일 메타데이터 목록. 실제 파일 바이너리는 별도 처리 */
  evidenceFiles: EvidenceFileMeta[];
}

/** 증거 파일 메타데이터 (파일 자체는 암호화 후 별도 업로드) */
export interface EvidenceFileMeta {
  /** 원본 파일명 */
  originalName: string;

  /** MIME 타입 (예: "image/jpeg") */
  mimeType: string;

  /** 파일 크기 (bytes) */
  sizeBytes: number;

  /**
   * 클라이언트가 생성한 임시 참조 ID.
   * 암호화된 파일 업로드 결과와 매핑할 때 사용.
   */
  clientRefId: string;
}

// ---------------------------------------------------------------------------
// 3. ReporterContact — 신고자키 잠금
//    신고자 신원 정보. 본인이 직접 공개 동의하기 전까지 누구도 열람 불가.
// ---------------------------------------------------------------------------
export interface ReporterContact {
  /** 신고자 유형 */
  reporterType: ReporterType;

  /** 연락 수단 유형 */
  contactMethod: ContactMethod;

  /**
   * 연락처 값.
   * contactMethod에 따라 전화번호·이메일 등이 들어온다.
   * none인 경우 빈 문자열.
   */
  contactValue: string;

  /**
   * 신고자가 향후 신원 공개에 동의하는지 여부.
   * false = 절대 비공개, true = 임계값 충족 후 수신자에게 공개 가능.
   */
  consentToReveal: boolean;
}

/** 신고자 유형 */
export type ReporterType =
  | "self"       // 피해 당사자 본인
  | "coworker"   // 같은 시설 동료
  | "family"     // 피해자 가족·보호자
  | "other";     // 기타

/** 연락 수단 */
export type ContactMethod =
  | "phone"   // 전화번호
  | "email"   // 이메일
  | "none";   // 연락처 제공 안 함

// ---------------------------------------------------------------------------
// 4. ReportDraft — 제출 직전 상태
//    신고 폼에서 사용자가 입력 중인 전체 데이터를 하나로 묶는 타입.
//    실제 제출 시 각 그룹이 분리·암호화된다.
// ---------------------------------------------------------------------------
export interface ReportDraft {
  /** tag 잠금 대상: 가해자·시설 식별 정보 */
  matching: MatchingData;

  /** 이중 잠금 대상: 사건 내용 */
  incident: IncidentData;

  /** 신고자키 잠금 대상: 신고자 신원 및 연락처 */
  reporterContact: ReporterContact;

  /** 클라이언트 측 임시 초안 ID. 세션 내 중복 제출 방지용 */
  draftId: string;

  /** 초안 최초 생성 시각 (ISO 8601) */
  createdAt: string;
}
