const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:3001";

export interface ReportPayload {
  matching: {
    tag: string;
    share: { x: string; y: string };
  };
  incident: { C: string; encryptedK: string };
  reporterContact: { C: string; encryptedK: string };
}

export interface ReportResult {
  id: string;
  matched: boolean;
}

export async function submitReport(payload: ReportPayload): Promise<ReportResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다. 네트워크 연결을 확인해 주세요.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`서버 오류가 발생했습니다 (${res.status}). 잠시 후 다시 시도해 주세요.${text ? " — " + text : ""}`);
  }

  return res.json() as Promise<ReportResult>;
}
