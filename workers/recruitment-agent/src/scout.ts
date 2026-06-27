import type { SourcePlatform, Candidate, Env } from "./types";

export interface ScoutResult {
  platform: SourcePlatform;
  candidates: Candidate[];
  error?: string;
}

export class ScoutScheduler {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async search(platform: SourcePlatform, query: string): Promise<ScoutResult> {
    if (!query.trim()) {
      return { platform, candidates: [], error: "Empty query" };
    }

    try {
      switch (platform) {
        case "pixiv":
          return this.searchPixiv(query);
        case "deviantart":
          return this.searchDeviantArt(query);
        case "artstation":
          return this.searchArtStation(query);
        case "twitter":
          return this.searchTwitter(query);
        case "behance":
          return this.searchBehance(query);
        case "webtoon":
          return this.searchWebtoon(query);
        case "tapas":
          return this.searchTapas(query);
        case "mangaplus":
          return this.searchMangaPlus(query);
        case "manual":
          return this.validateManualUrl(query);
        default:
          return { platform, candidates: [], error: `Unsupported platform: ${platform}` };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { platform, candidates: [], error: message };
    }
  }

  private async searchPixiv(query: string): Promise<ScoutResult> {
    const token = this.env.PIXIV_ACCESS_TOKEN;
    if (!token) return { platform: "pixiv", candidates: [], error: "No Pixiv access token configured" };

    const url = `https://app-api.pixiv.net/v1/search/illust?word=${encodeURIComponent(query)}&search_target=partial_match_for_tags&sort=date_desc`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { platform: "pixiv", candidates: [], error: `Pixiv API error: ${res.status}` };

    const data: any = await res.json();
    const candidates: Candidate[] = (data.illusts || []).slice(0, 20).map((illust: any) => ({
      id: crypto.randomUUID(),
      sourceUrl: `https://www.pixiv.net/en/users/${illust.user.id}`,
      sourcePlatform: "pixiv" as SourcePlatform,
      creatorName: illust.user.name,
      creatorHandle: illust.user.account,
      avatarUrl: illust.user.profile_image_urls?.medium,
      followerCount: 0,
      status: "pending" as const,
      createdAt: Date.now(),
    }));

    return { platform: "pixiv", candidates };
  }

  private async searchDeviantArt(query: string): Promise<ScoutResult> {
    const token = this.env.DEVIANTART_ACCESS_TOKEN;
    if (!token) return { platform: "deviantart", candidates: [], error: "No DeviantArt access token configured" };

    const url = `https://www.deviantart.com/api/v1/oauth2/search/${encodeURIComponent(query)}?limit=20`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { platform: "deviantart", candidates: [], error: `DeviantArt API error: ${res.status}` };

    const data: any = await res.json();
    const candidates: Candidate[] = (data.results || []).slice(0, 20).map((item: any) => ({
      id: crypto.randomUUID(),
      sourceUrl: `https://www.deviantart.com/${item.author?.username}`,
      sourcePlatform: "deviantart" as SourcePlatform,
      creatorName: item.author?.username || "Unknown",
      creatorHandle: item.author?.username,
      avatarUrl: item.author?.usericon,
      followerCount: item.stats?.favourites || 0,
      status: "pending" as const,
      createdAt: Date.now(),
    }));

    return { platform: "deviantart", candidates };
  }

  private async searchArtStation(query: string): Promise<ScoutResult> {
    const url = `https://www.artstation.com/api/v2/search/projects.json?query=${encodeURIComponent(query)}&per_page=20`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return { platform: "artstation", candidates: [], error: `ArtStation API error: ${res.status}` };

    const data: any = await res.json();
    const candidates: Candidate[] = (data.data || []).slice(0, 20).map((item: any) => ({
      id: crypto.randomUUID(),
      sourceUrl: `https://www.artstation.com/${item.user?.username}`,
      sourcePlatform: "artstation" as SourcePlatform,
      creatorName: item.user?.full_name || "Unknown",
      creatorHandle: item.user?.username,
      avatarUrl: item.user?.avatar_url,
      followerCount: item.user?.followers_count || 0,
      status: "pending" as const,
      createdAt: Date.now(),
    }));

    return { platform: "artstation", candidates };
  }

  private async searchTwitter(query: string): Promise<ScoutResult> {
    const token = this.env.TWITTER_BEARER_TOKEN;
    if (!token) return { platform: "twitter", candidates: [], error: "No Twitter bearer token configured" };

    const url = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(query)}?user.fields=profile_image_url,public_metrics`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { platform: "twitter", candidates: [], error: `Twitter API error: ${res.status}` };

    const data: any = await res.json();
    if (!data.data) return { platform: "twitter", candidates: [], error: "User not found" };

    const user = data.data;
    const candidate: Candidate = {
      id: crypto.randomUUID(),
      sourceUrl: `https://twitter.com/${user.username}`,
      sourcePlatform: "twitter" as SourcePlatform,
      creatorName: user.name,
      creatorHandle: user.username,
      avatarUrl: user.profile_image_url,
      followerCount: user.public_metrics?.followers_count || 0,
      status: "pending" as const,
      createdAt: Date.now(),
    };

    return { platform: "twitter", candidates: [candidate] };
  }

  private async searchBehance(query: string): Promise<ScoutResult> {
    const clientId = this.env.BEHANCE_CLIENT_ID;
    if (!clientId) return { platform: "behance", candidates: [], error: "No Behance client ID configured" };

    const url = `https://www.behance.net/v2/search/users?q=${encodeURIComponent(query)}&client_id=${clientId}&per_page=20`;
    const res = await fetch(url);
    if (!res.ok) return { platform: "behance", candidates: [], error: `Behance API error: ${res.status}` };

    const data: any = await res.json();
    const candidates: Candidate[] = (data.users || []).slice(0, 20).map((user: any) => ({
      id: crypto.randomUUID(),
      sourceUrl: `https://www.behance.net/${user.username}`,
      sourcePlatform: "behance" as SourcePlatform,
      creatorName: user.display_name || "Unknown",
      creatorHandle: user.username,
      avatarUrl: user.images?.["50"],
      followerCount: user.stats?.followers || 0,
      status: "pending" as const,
      createdAt: Date.now(),
    }));

    return { platform: "behance", candidates };
  }

  private async searchWebtoon(query: string): Promise<ScoutResult> {
    const url = `https://www.webtoons.com/en/search?keyword=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { platform: "webtoon", candidates: [], error: `Webtoon fetch error: ${res.status}` };

    const html = await res.text();
    // Extract creator info from card elements
    const nameRegex = /<p class="subj">([^<]+)<\/p>/g;
    const authorRegex = /<p class="author">([^<]+)<\/p>/g;
    const thumbRegex = /<img[^>]+src="([^"]+)"[^>]*class="[^"]*thumb[^"]*"/g;

    const names: string[] = [];
    let match;
    while ((match = nameRegex.exec(html)) !== null) names.push(match[1].trim());

    const authors: string[] = [];
    while ((match = authorRegex.exec(html)) !== null) authors.push(match[1].trim());

    const thumbs: string[] = [];
    while ((match = thumbRegex.exec(html)) !== null) thumbs.push(match[1]);

    const max = Math.min(names.length, 20);
    const candidates: Candidate[] = [];
    for (let i = 0; i < max; i++) {
      candidates.push({
        id: crypto.randomUUID(),
        sourceUrl: `https://www.webtoons.com/en/search?keyword=${encodeURIComponent(query)}`,
        sourcePlatform: "webtoon" as SourcePlatform,
        creatorName: authors[i] || names[i] || "Unknown",
        creatorHandle: names[i],
        avatarUrl: thumbs[i],
        followerCount: 0,
        status: "pending" as const,
        createdAt: Date.now(),
      });
    }

    return { platform: "webtoon", candidates };
  }

  private async searchTapas(query: string): Promise<ScoutResult> {
    const url = `https://tapas.io/search/${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { platform: "tapas", candidates: [], error: `Tapas fetch error: ${res.status}` };

    const html = await res.text();
    const nameRegex = /<a[^>]+class="[^"]*creator-name[^"]*"[^>]*>([^<]+)<\/a>/g;
    const thumbRegex = /<img[^>]+class="[^"]*avatar[^"]*"[^>]+src="([^"]+)"/g;

    const names: string[] = [];
    let match;
    while ((match = nameRegex.exec(html)) !== null) names.push(match[1].trim());

    const thumbs: string[] = [];
    while ((match = thumbRegex.exec(html)) !== null) thumbs.push(match[1]);

    const candidates: Candidate[] = names.slice(0, 20).map((name, i) => ({
      id: crypto.randomUUID(),
      sourceUrl: `https://tapas.io/search/${encodeURIComponent(query)}`,
      sourcePlatform: "tapas" as SourcePlatform,
      creatorName: name,
      avatarUrl: thumbs[i],
      followerCount: 0,
      status: "pending" as const,
      createdAt: Date.now(),
    }));

    return { platform: "tapas", candidates };
  }

  private async searchMangaPlus(query: string): Promise<ScoutResult> {
    const url = `https://jumpg-web-api.tokyo-cdn.com/api/v3/search?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return { platform: "mangaplus", candidates: [], error: `MangaPlus API error: ${res.status}` };

    const data: any = await res.json();
    const titles = data.success?.titles || [];
    const candidates: Candidate[] = titles.slice(0, 20).map((item: any) => ({
      id: crypto.randomUUID(),
      sourceUrl: `https://mangaplus.shueisha.co.jp/titles/${item.titleId}`,
      sourcePlatform: "mangaplus" as SourcePlatform,
      creatorName: item.author || "Unknown",
      creatorHandle: item.titleName,
      avatarUrl: item.portraitImageUrl,
      followerCount: 0,
      status: "pending" as const,
      createdAt: Date.now(),
    }));

    return { platform: "mangaplus", candidates };
  }

  private async validateManualUrl(input: string): Promise<ScoutResult> {
    try {
      const url = new URL(input);
      if (!url.protocol.startsWith("http")) {
        return { platform: "manual", candidates: [], error: "URL must use http or https protocol" };
      }

      const candidate: Candidate = {
        id: crypto.randomUUID(),
        sourceUrl: url.toString(),
        sourcePlatform: "manual" as SourcePlatform,
        creatorName: url.hostname,
        followerCount: 0,
        status: "pending" as const,
        createdAt: Date.now(),
      };

      return { platform: "manual", candidates: [candidate] };
    } catch {
      return { platform: "manual", candidates: [], error: "Invalid URL format" };
    }
  }
}
