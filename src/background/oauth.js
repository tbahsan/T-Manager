/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/background/oauth.js
 *  Purpose : OAuth 2.0 via browser.identity.launchWebAuthFlow
 *            (Chrome + Firefox + Firefox-Android, plan §৬).
 *            Multi-channel: one token per Google account,
 *            stored in yt.oauth.tokens.<accountId> (§৯.৮).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — authUrl + client-ID resolution (Pro-mode override)
 *   §2 — login(): consent → token → channels.list → account card
 *   §3 — getAccessToken(): expiry + silent re-flow
 *   §4 — switch/logout + getAuthState/getApplicationContext
 *  NO client secret ships — implicit flow only.
 * ═══════════════════════════════════════════════════════
 */
import browser from "webextension-polyfill";
import { OAUTH, API } from "../shared/constants.js";
import { get, set, remove, update } from "../shared/storage.js";
import { getSettings } from "../shared/settings.js";

// ── §1: Consent URL + client ID ────────────────────────
async function resolveClientId() {
  // Pro mode: user's own client ID (per GCP project = own quota) wins.
  const s = await getSettings();
  const override = s.clientIds?.[__BROWSER__];
  const id = override || OAUTH.CLIENT_IDS[__BROWSER__];
  if (!id) throw Object.assign(new Error("No OAuth client ID for this browser yet — add it in Settings → Pro mode (plan §২১)"), { code: "NO_CLIENT_ID" });
  return id;
}

async function buildAuthUrl({ prompt = "consent select_account" } = {}) {
  const qs = new URLSearchParams({
    client_id: await resolveClientId(),
    redirect_uri: browser.identity.getRedirectURL(),
    response_type: "token",
    scope: OAUTH.SCOPES.join(" "),
    prompt,
  });
  return `${OAUTH.AUTH_URL}?${qs}`;
}

// ── §2: Login ──────────────────────────────────────────
/**
 * Interactive consent → token → channel card via channels.list(mine).
 * `select_account` lets the user add another Google account → new channel.
 */
export async function login() {
  const redirect = browser.identity.getRedirectURL();
  const resultUrl = await browser.identity.launchWebAuthFlow({ interactive: true, url: await buildAuthUrl() });
  if (!resultUrl?.startsWith(redirect)) throw Object.assign(new Error("OAuth redirect mismatch"), { code: "REDIRECT_MISMATCH" });

  const hash = new URLSearchParams(resultUrl.split("#")[1] ?? "");
  const accessToken = hash.get("access_token");
  if (!accessToken) throw Object.assign(new Error(hash.get("error_description") || "No access token"), { code: hash.get("error") || "NO_TOKEN" });
  const token = { accessToken, expiresAt: Date.now() + Number(hash.get("expires_in") ?? 3600) * 1000 };

  const ch = await fetchChannelMine(token.accessToken);
  if (!ch) throw Object.assign(new Error("No YouTube channel on this Google account"), { code: "NO_CHANNEL" });

  const account = { id: ch.id, title: ch.snippet.title, thumbnail: ch.snippet.thumbnails?.default?.url ?? "", addedAt: new Date().toISOString() };
  await update("yt.accounts", (list = []) => [...list.filter((a) => a.id !== account.id), account]);
  await update("yt.oauth.tokens", (t = {}) => ({ ...t, [account.id]: token }));
  if (!(await get("yt.activeAccount"))) await set("yt.activeAccount", account.id);
  return getAuthState();
}

async function fetchChannelMine(accessToken) {
  const res = await fetch(`${API.BASE}/channels?part=snippet&mine=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw Object.assign(new Error(`channels.list ${res.status}`), { code: "API_ERROR" });
  return (await res.json()).items?.[0] ?? null;
}

// ── §3: Token access ───────────────────────────────────
/** Valid access token for the ACTIVE account; silent re-flow on expiry. */
export async function getAccessToken() {
  const active = await get("yt.activeAccount");
  if (!active) throw Object.assign(new Error("Not signed in"), { code: "AUTH_REQUIRED" });
  const tokens = await get("yt.oauth.tokens", {});
  const token = tokens[active];
  if (!token) throw Object.assign(new Error("Account needs re-connect"), { code: "AUTH_REQUIRED" });
  if (Date.now() < token.expiresAt - 60_000) return token.accessToken;

  try {
    const url = await browser.identity.launchWebAuthFlow({ interactive: false, url: await buildAuthUrl({ prompt: "none" }) });
    const hash = new URLSearchParams(url.split("#")[1] ?? "");
    if (hash.get("access_token")) {
      token.accessToken = hash.get("access_token");
      token.expiresAt = Date.now() + Number(hash.get("expires_in") ?? 3600) * 1000;
      await update("yt.oauth.tokens", (t = {}) => ({ ...t, [active]: token }));
    }
  } catch { /* silent failed → caller shows Re-connect state (plan §৬.3) */ }
  return token.accessToken;
}

// ── §4: Switch / logout / state ────────────────────────
/** One-click switch: known account → flip active; unknown → new consent. */
export async function switchAccount(accountId) {
  const tokens = await get("yt.oauth.tokens", {});
  if (!tokens[accountId]) return login(); // new Google account → full consent
  await set("yt.activeAccount", accountId);
  return getAuthState();
}

export async function logout() {
  const active = await get("yt.activeAccount");
  const tokens = await get("yt.oauth.tokens", {});
  if (active && tokens[active]) {
    await fetch(OAUTH.REVOKE_URL, { method: "POST", body: new URLSearchParams({ token: tokens[active].accessToken }) }).catch(() => {});
    await update("yt.oauth.tokens", (t = {}) => { const c = { ...t }; delete c[active]; return c; });
    await update("yt.accounts", (list = []) => list.filter((a) => a.id !== active));
  }
  const rest = await get("yt.accounts", []);
  await set("yt.activeAccount", rest[0]?.id ?? null);
  return getAuthState();
}

export async function getAuthState() {
  return {
    signedIn: Boolean(await get("yt.activeAccount")),
    accounts: await get("yt.accounts", []),
    activeAccountId: await get("yt.activeAccount"),
  };
}

/** Everything downstream modules need: active channel + its id. */
export async function getApplicationContext() {
  const accounts = await get("yt.accounts", []);
  const active = await get("yt.activeAccount");
  const acc = accounts.find((a) => a.id === active);
  if (!acc) throw Object.assign(new Error("Not signed in"), { code: "AUTH_REQUIRED" });
  return { channelId: acc.id, channelTitle: acc.title, thumbnail: acc.thumbnail };
}

// Silence lint for intentionally-unused import path keeper.
void remove;
