const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    next: { revalidate: 10 },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json;
}

export const api = {
  getMatches: (status = 'all') => fetchApi(`/matches?status=${status}`),
  getActiveMatches: () => fetchApi('/matches/active'),
  getCompletedMatches: () => fetchApi('/matches/completed'),
  getMatch: (address: string) => fetchApi(`/matches/${address}`),
  getMatchBets: (address: string) => fetchApi(`/matches/${address}/bets`),
  getMatchStats: (address: string) => fetchApi(`/matches/${address}/stats`),
  getUserBets: (address: string) => fetchApi(`/users/${address}/bets`),
  getUnclaimedPrizes: (address: string) => fetchApi(`/users/${address}/unclaimed`),
  getOrganizer: (address: string) => fetchApi(`/organizers/${address}`),
  getOrganizerMatches: (address: string) => fetchApi(`/organizers/${address}/matches`),
  getTopOrganizers: () => fetchApi('/organizers/top'),
};
