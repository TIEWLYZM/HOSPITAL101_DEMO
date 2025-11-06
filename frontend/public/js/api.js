const API = location.hostname === "localhost"
  ? "http://localhost:8080"
  : (window.API_BASE || "/api");

export async function apiGet(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
export async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
export async function apiPatch(path, body) {
  const r = await fetch(`${API}${path}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
