const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:3001";

export interface AdminReport {
  id: string;
  shareX: string;
  shareY: string;
  incidentC: string;
  incidentEncryptedK: string;
  contactC: string;
  contactEncryptedK: string;
  createdAt: string;
}

export interface AdminMatchedCase {
  tag: string;
  count: number;
  reports: AdminReport[];
}

export interface AdminMatchesResponse {
  matches: AdminMatchedCase[];
}

export async function fetchAdminMatches(adminKey: string): Promise<AdminMatchesResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/admin/matches`, {
      headers: { "x-admin-key": adminKey },
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요.");
  }

  if (res.status === 401) {
    throw new Error("관리자 키가 올바르지 않습니다.");
  }
  if (!res.ok) {
    throw new Error(`서버 오류 (${res.status})`);
  }

  return res.json() as Promise<AdminMatchesResponse>;
}
