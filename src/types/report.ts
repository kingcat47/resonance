/**
 * 공명(Resonance) 신고 데이터 타입 정의 — 직장 내 괴롭힘 버전
 *
 * 잠금 구조 개요:
 *  - MatchingData     → tag 잠금     : 가해자 태그를 만드는 재료. 서버가 매칭에만 사용하고 원문은 볼 수 없어야 함.
 *  - IncidentData     → 이중 잠금    : 사건 내용. 임계값 충족 전까지 아무도 열람 불가.
 *  - ReporterContact  → 신고자키 잠금: 신고자 신원. 본인 동의 전까지 누구도 열람 불가.
 */

// ---------------------------------------------------------------------------
// 1. MatchingData — tag 잠금
//    서버는 이 데이터를 해시/태그 형태로만 보고 원문은 볼 수 없다.
//    같은 회사·가해자를 2명 이상 지목하면 임계값 매칭이 트리거된다.
// ---------------------------------------------------------------------------
export interface MatchingData {
  /** 회사 식별자 (예: 회사명 또는 사업자등록번호). tag 생성 재료 */
  companyId: string;

  /** 가해자 이름. tag 생성 재료로만 쓰이고 서버에 평문 전달 금지 */
  perpetratorName: string;

  /** 가해자 직위 또는 소속 부서 (예: "팀장", "인사팀"). 동명이인 구분 보조 */
  perpetratorDept: string;

  /** 가해자 추가 식별 정보 (선택). 특징 등 자유 기술 */
  perpetratorDescription?: string;
}

// ---------------------------------------------------------------------------
// 2. IncidentData — 이중 잠금
//    사건의 구체적 내용. 임계값 매칭이 완료될 때까지 서버도 수신자도 열람 불가.
// ---------------------------------------------------------------------------
export interface IncidentData {
  /** 사건 발생 일시. 정확한 시각을 모를 경우 날짜만 입력 가능하도록 string */
  occurredAt: string;

  /** 발생 장소 (예: "3층 회의실", "업무용 단톡방") */
  locationDetail: string;

  /** 행위 유형 (복수 선택 가능) */
  harassmentTypes: HarassmentType[];

  /** 행위자와 피해자의 관계 */
  perpetratorRelation: PerpRelation;

  /** 구체적 행위 내용 자유 서술 (최대 500자 권장) */
  description: string;

  /** 반복성 정황 */
  recurrence: RecurrenceInfo;

  /** 첨부 증거 파일 메타데이터 목록 (파일 바이너리는 별도 처리) */
  evidenceFiles: EvidenceFileMeta[];
}

/** 직장 내 괴롭힘 행위 유형 */
export type HarassmentType =
  | "verbal"      // 폭언·욕설·모욕
  | "exclusion"   // 따돌림·집단 무시
  | "unfair"      // 부당 지시·과도한 업무 부여
  | "physical"    // 신체적 폭력
  | "sexual"      // 성적 괴롭힘
  | "privacy"     // 사생활 침해
  | "other";      // 기타

/** 행위자와 피해자의 관계 */
export type PerpRelation =
  | "superior"    // 상사 (직속 또는 임원)
  | "peer"        // 동료 (같은 직급)
  | "employer"    // 사용자 (사업주·대표)
  | "other";      // 기타

/** 반복성 정황 */
export interface RecurrenceInfo {
  /** 지속 기간 (예: "약 3개월", "2024년 1월부터") */
  duration: string;

  /** 횟수 또는 빈도 (예: "주 2~3회", "총 5회 이상") */
  frequency: string;
}

/** 증거 파일 메타데이터 + 암호화 전 바이너리 (incident 암호화 페이로드에 포함) */
export interface EvidenceFileMeta {
  /** 원본 파일명 */
  originalName: string;

  /** MIME 타입 (예: "image/jpeg", "audio/mpeg") */
  mimeType: string;

  /** 파일 크기 (bytes) */
  sizeBytes: number;

  /**
   * 클라이언트가 생성한 임시 참조 ID.
   */
  clientRefId: string;

  /**
   * 파일 바이너리 Base64 인코딩.
   * incident 전체와 함께 AES-256-GCM + RSA-OAEP로 암호화되어 서버에 저장된다.
   * 서버는 이 값을 복호화할 수 없다.
   */
  dataBase64: string;
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
   * false = 절대 비공개, true = 임계값 충족 후 조사기관에 공개 가능.
   */
  consentToReveal: boolean;
}

/** 신고자 유형 */
export type ReporterType =
  | "self"       // 피해 당사자 본인
  | "coworker"   // 같은 회사 동료
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
  /** tag 잠금 대상: 회사·가해자 식별 정보 */
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
