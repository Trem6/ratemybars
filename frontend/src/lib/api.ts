const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const TOKEN_KEY = "auth_token";

// Token helpers for localStorage-based auth (works cross-domain)
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v !== undefined)
    );
    url += `?${searchParams.toString()}`;
  }

  // Build headers with auth token if available
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || error.error || "Request failed");
  }

  return res.json();
}

// --- School APIs ---

export interface School {
  id: string;
  unitid: number;
  name: string;
  alias_name?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  control: "public" | "private_nonprofit" | "private_forprofit";
  iclevel: number;
  website?: string;
  latitude: number;
  longitude: number;
  county?: string;
  locale?: number;
  venue_count: number;
  frat_count: number;
  avg_rating?: number;
}

export interface MapSchool {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  state: string;
  control: string;
  iclevel: number;
  venue_count: number;
  avg_rating: number;
  frat_count: number;
  instsize: number;
  hbcu: boolean;
  is_online: boolean;
  is_tribal: boolean;
  is_religious: boolean;
  is_community_college: boolean;
  is_liberal_arts: boolean;
  is_graduate_only: boolean;
}

export interface FilterState {
  controlTypes: string[];
  schoolLevels: number[];
  instSizes: number[];
  showReligious: boolean;
  showHBCU: boolean;
  showTribal: boolean;
  showOnline: boolean;
  showCommunityCollege: boolean;
  showLiberalArts: boolean;
  showGraduateOnly: boolean;
  showGreekLife: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  controlTypes: ["public", "private_nonprofit"],
  schoolLevels: [1],
  instSizes: [1, 2, 3, 4, 5],
  showReligious: false,
  showHBCU: false,
  showTribal: false,
  showOnline: false,
  showCommunityCollege: false,
  showLiberalArts: false,
  showGraduateOnly: false,
  showGreekLife: false,
};

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface Venue {
  id: string;
  name: string;
  category: "bar" | "nightclub" | "frat" | "party_host" | "other";
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  school_id: string;
  school_name?: string;
  created_at: string;
  verified: boolean;
  avg_rating: number;
  rating_count: number;
  thumbs_up: number;
  thumbs_down: number;
}

export interface Rating {
  id: string;
  score: number;
  review?: string;
  venue_id: string;
  author_id: string;
  author_name?: string;
  created_at: string;
}

export interface FratWithRating {
  name: string;
  avg_rating: number;
  rating_count: number;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
    display_name?: string;
    avatar_url?: string;
  };
}

// Stats
export interface SiteStats {
  schools: number;
  venues: number;
  ratings: number;
}

export const getStats = () =>
  apiFetch<SiteStats>("/api/stats");

// Schools
export const searchSchools = (params: Record<string, string>) =>
  apiFetch<PaginatedResponse<School>>("/api/schools", { params });

export const getSchoolMapData = () =>
  apiFetch<MapSchool[]>("/api/schools/map");

export const getSchool = (id: string) =>
  apiFetch<School>(`/api/schools/${id}`);

export const getSchoolVenues = (id: string, page = 1, limit = 20) =>
  apiFetch<PaginatedResponse<Venue>>(`/api/schools/${id}/venues`, {
    params: { page: String(page), limit: String(limit) },
  });

export const getSchoolFraternities = (id: string) =>
  apiFetch<FratWithRating[]>(`/api/schools/${id}/fraternities`);

export const getSchoolRatings = (id: string) =>
  apiFetch<Rating[]>(`/api/schools/${id}/ratings`);

export const getAllFraternities = () =>
  apiFetch<string[]>("/api/fraternities");

export const getSchoolsByFrat = (name: string) =>
  apiFetch<string[]>("/api/fraternities/schools", { params: { name } });

// Leaderboard
export interface LeaderboardSchool {
  rank: number;
  id: string;
  name: string;
  state: string;
  control: string;
  venue_count: number;
  avg_rating: number;
  frat_count: number;
  party_score: number;
}

export interface LeaderboardUser {
  rank: number;
  username: string;
  rating_count: number;
}

export const getLeaderboardSchools = () =>
  apiFetch<LeaderboardSchool[]>("/api/leaderboard/schools");

export const getLeaderboardUsers = () =>
  apiFetch<LeaderboardUser[]>("/api/leaderboard/users");

export interface ActivityItem {
  type: "rating" | "venue" | "frat_rating";
  text: string;
  timestamp: string;
}

export const getRecentActivity = () =>
  apiFetch<ActivityItem[]>("/api/activity/recent");

export const getStates = () =>
  apiFetch<string[]>("/api/schools/states");

// Venues
export const getVenue = (id: string) =>
  apiFetch<Venue>(`/api/venues/${id}`);

export const createVenue = (data: {
  name: string;
  category: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  school_id: string;
}) =>
  apiFetch<Venue>("/api/venues", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getVenueRatings = (id: string) =>
  apiFetch<Rating[]>(`/api/venues/${id}/ratings`);

// Ratings
export const createRating = (data: {
  score: number;
  review?: string;
  venue_id: string;
}) =>
  apiFetch<Rating>("/api/ratings", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const createFratRating = (data: {
  frat_name: string;
  school_id: string;
  score: number;
}) =>
  apiFetch<FratWithRating>("/api/frat-ratings", {
    method: "POST",
    body: JSON.stringify(data),
  });

// Auth
export const register = (data: {
  email: string;
  password: string;
  username: string;
}) =>
  apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const login = (data: { email: string; password: string }) =>
  apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const logout = () =>
  apiFetch<{ message: string }>("/api/auth/logout", { method: "POST" });

export const getMe = () =>
  apiFetch<AuthResponse["user"]>("/api/auth/me");

// Admin
export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
}

export const getPendingVenues = () =>
  apiFetch<Venue[]>("/api/admin/venues/pending");

export const approveVenue = (id: string) =>
  apiFetch<{ message: string }>(`/api/admin/venues/${id}/approve`, { method: "POST" });

export const rejectVenue = (id: string) =>
  apiFetch<{ message: string }>(`/api/admin/venues/${id}/reject`, { method: "DELETE" });

export const getAdminUsers = () =>
  apiFetch<AdminUser[]>("/api/admin/users");

export const updateUserRole = (id: string, role: string) =>
  apiFetch<{ message: string }>(`/api/admin/users/${id}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });

export const adminSearchVenues = (q: string) =>
  apiFetch<Venue[]>("/api/admin/venues/search", { params: { q } });

export const adminDeleteVenue = (id: string) =>
  apiFetch<{ message: string }>(`/api/admin/venues/${id}`, { method: "DELETE" });

export const adminAddFrat = (fratName: string, schoolId: string) =>
  apiFetch<{ status: string }>("/api/admin/fraternities", {
    method: "POST",
    body: JSON.stringify({ frat_name: fratName, school_id: schoolId }),
  });

export const adminRemoveFrat = (fratName: string, schoolId: string) =>
  apiFetch<{ status: string }>("/api/admin/fraternities", {
    method: "DELETE",
    params: { frat_name: fratName, school_id: schoolId },
  });
