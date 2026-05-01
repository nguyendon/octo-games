import type { LevelCompleteResult, LevelId, PlayerProfile } from "@octo/shared";

const DEVICE_ID_KEY = "octo-games:device-id";

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 402) {
    const data = await res.json().catch(() => ({}));
    const err = new Error("insufficient_funds") as Error & { totalMoney?: number };
    err.totalMoney = data?.totalMoney;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchProfile(): Promise<PlayerProfile> {
  return postJson<PlayerProfile>("/api/profile", { deviceId: getDeviceId() });
}

export async function spendMoney(amount: number): Promise<PlayerProfile> {
  return postJson<PlayerProfile>("/api/profile/spend", { deviceId: getDeviceId(), amount });
}

export async function recordLevelComplete(
  level: LevelId,
  timeSeconds: number,
  moneyEarned: number,
): Promise<LevelCompleteResult> {
  return postJson<LevelCompleteResult>("/api/profile/level-complete", {
    deviceId: getDeviceId(),
    level,
    timeSeconds,
    moneyEarned,
  });
}
