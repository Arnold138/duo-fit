// Duo Fit — liaison Strava (fonction Supabase Edge « strava », verify_jwt = false).
// Routes : /start (connecté) · /callback (retour Strava) · /webhook (Strava → nous) · /status · /unlink · /subscribe
// Seul secret à définir : STRAVA_CLIENT_SECRET (Supabase → Edge Functions → Secrets).
import { createClient } from "jsr:@supabase/supabase-js@2";

const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET") ?? "";
const VERIFY_TOKEN = "duofit-strava-webhook";
const APP_URL = Deno.env.get("APP_URL") ?? "https://arnold138.github.io/duo-fit/";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const FN_URL = `${SB_URL}/functions/v1/strava`;
const db = createClient(SB_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const back = (q: string) => new Response(null, { status: 302, headers: { Location: `${APP_URL}?strava=${q}#profil` } });

async function userOf(req: Request) {
  const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  return data.user ?? null;
}

async function tokenFor(link: { user_id: string; access_token: string; refresh_token: string; expires_at: number }) {
  if (link.expires_at > Date.now() / 1000 + 120) return link.access_token;
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "refresh_token", refresh_token: link.refresh_token }),
  });
  const t = await r.json();
  if (!t.access_token) throw new Error("refresh failed");
  await db.from("strava_links").update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at }).eq("user_id", link.user_id);
  return t.access_token as string;
}

function toRun(a: Record<string, any>) {
  return {
    name: a.name,
    type: a.sport_type ?? a.type,
    date: String(a.start_date_local ?? a.start_date).slice(0, 10),
    km: (a.distance ?? 0) / 1000,
    sec: a.moving_time ?? a.elapsed_time ?? 0,
    elev: a.total_elevation_gain ?? 0,
    hr: a.average_heartrate ?? null,
  };
}

async function saveActivity(userId: string, a: Record<string, any>) {
  if (!RUN_TYPES.has(a.sport_type ?? a.type)) return;
  await db.from("strava_activities").upsert({ user_id: userId, activity_id: a.id, data: toRun(a), updated_at: new Date().toISOString() });
}

async function backfill(userId: string, token: string) {
  const after = Math.floor(Date.now() / 1000) - 60 * 86400;
  const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return;
  for (const a of await r.json()) await saveActivity(userId, a);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).pop();

  try {
    // 1. L'app demande l'adresse de connexion Strava
    if (route === "start") {
      const user = await userOf(req);
      if (!user) return json({ error: "Non connecté" }, 401);
      if (!CLIENT_ID || !CLIENT_SECRET) return json({ error: "Strava n'est pas encore configuré" }, 503);
      const state = crypto.randomUUID();
      await db.from("strava_oauth_states").insert({ state, user_id: user.id });
      const q = new URLSearchParams({
        client_id: CLIENT_ID, response_type: "code", redirect_uri: `${FN_URL}/callback`,
        approval_prompt: "auto", scope: "read,activity:read_all", state,
      });
      return json({ url: `https://www.strava.com/oauth/authorize?${q}` });
    }

    // 2. Retour de Strava après accord
    if (route === "callback") {
      const code = url.searchParams.get("code"), state = url.searchParams.get("state");
      if (!code || !state) return back("refus");
      const { data: st } = await db.from("strava_oauth_states").select("user_id, created_at").eq("state", state).maybeSingle();
      await db.from("strava_oauth_states").delete().eq("state", state);
      if (!st || Date.now() - Date.parse(st.created_at) > 15 * 60000) return back("expire");
      const r = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, grant_type: "authorization_code" }),
      });
      const t = await r.json();
      if (!t.access_token || !t.athlete) return back("erreur");
      await db.from("strava_links").delete().eq("athlete_id", t.athlete.id).neq("user_id", st.user_id);
      await db.from("strava_links").upsert({
        user_id: st.user_id, athlete_id: t.athlete.id,
        athlete_name: [t.athlete.firstname, t.athlete.lastname].filter(Boolean).join(" "),
        access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at,
      });
      await backfill(st.user_id, t.access_token);
      return back("ok");
    }

    // 3. Webhook Strava : validation puis événements
    if (route === "webhook") {
      if (req.method === "GET") {
        if (url.searchParams.get("hub.verify_token") !== VERIFY_TOKEN) return json({ error: "token" }, 403);
        return json({ "hub.challenge": url.searchParams.get("hub.challenge") });
      }
      const ev = await req.json();
      const { data: link } = await db.from("strava_links").select("*").eq("athlete_id", ev.owner_id).maybeSingle();
      if (!link) return json({ ok: true });
      if (ev.object_type === "athlete" && ev.updates?.authorized === "false") {
        await db.from("strava_links").delete().eq("user_id", link.user_id);
        return json({ ok: true });
      }
      if (ev.object_type === "activity") {
        if (ev.aspect_type === "delete") {
          await db.from("strava_activities").delete().eq("user_id", link.user_id).eq("activity_id", ev.object_id);
        } else {
          const token = await tokenFor(link);
          const r = await fetch(`https://www.strava.com/api/v3/activities/${ev.object_id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (r.ok) await saveActivity(link.user_id, await r.json());
        }
      }
      return json({ ok: true });
    }

    // 4. Statut de liaison pour l'app
    if (route === "status") {
      const user = await userOf(req);
      if (!user) return json({ linked: false });
      const { data } = await db.from("strava_links").select("athlete_name").eq("user_id", user.id).maybeSingle();
      return json({ linked: !!data, name: data?.athlete_name ?? "" });
    }

    // 5. Délier
    if (route === "unlink") {
      const user = await userOf(req);
      if (!user) return json({ error: "Non connecté" }, 401);
      const { data: link } = await db.from("strava_links").select("*").eq("user_id", user.id).maybeSingle();
      if (link) {
        await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { Authorization: `Bearer ${link.access_token}` } }).catch(() => {});
        await db.from("strava_links").delete().eq("user_id", user.id);
      }
      return json({ ok: true });
    }

    // 6. Abonnement au webhook (une seule fois)
    if (route === "subscribe") {
      const list = await fetch(`https://www.strava.com/api/v3/push_subscriptions?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`).then((r) => r.json());
      if (Array.isArray(list) && list.length) return json({ already: list });
      const body = new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, callback_url: `${FN_URL}/webhook`, verify_token: VERIFY_TOKEN });
      const r = await fetch("https://www.strava.com/api/v3/push_subscriptions", { method: "POST", body });
      return json(await r.json(), r.status);
    }

    return json({ error: "route inconnue" }, 404);
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
