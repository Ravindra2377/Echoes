const BASE_URL = "http://127.0.0.1:8000";

export async function fetchApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 204) return null;
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Timeline & Diary
  getTimeline: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetchApi(`/api/timeline${q ? `?${q}` : ""}`);
  },
  getDay: (day) => fetchApi(`/api/days/${day}`),
  getOnThisDay: (date) => fetchApi(`/api/on-this-day${date ? `?date=${date}` : ""}`),
  search: (q, limit = 50) => fetchApi(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  searchGlobal: (q, limit = 20) => fetchApi(`/api/search/global?q=${encodeURIComponent(q)}&limit=${limit}`),
  logListen: (data) => fetchApi("/api/listens", { method: "POST", body: JSON.stringify(data) }),
  getLastPlayed: () => fetchApi("/api/last-played"),

  // Pulse Line & Day Titles (used by diary screen)
  getPulse: (days = 45) => fetchApi(`/api/pulse?days=${days}`),
  setDayTitle: (day, title) => fetchApi(`/api/days/${day}/title`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  }),

  // Notes & Moods
  addNote: (note) => fetchApi("/api/notes", { method: "POST", body: JSON.stringify(note) }),
  editNote: (nid, patch) => fetchApi(`/api/notes/${nid}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteNote: (nid) => fetchApi(`/api/notes/${nid}`, { method: "DELETE" }),

  // Stats & Sync
  getStats: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetchApi(`/api/stats${q ? `?${q}` : ""}`);
  },
  triggerSync: (source, wait = false) => {
    const q = new URLSearchParams();
    if (source) q.set("source", source);
    if (wait) q.set("wait", "true");
    const qs = q.toString();
    return fetchApi(`/api/sync${qs ? `?${qs}` : ""}`, { method: "POST" });
  },
  getSyncStatus: () => fetchApi("/api/sync/status"),
};

export default api;
