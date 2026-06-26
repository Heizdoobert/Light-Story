import type { Candidate, Evaluation, Env } from "./types";

export class CreatorEvaluator {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async evaluate(candidate: Candidate): Promise<Evaluation> {
    try {
      const images = await this.fetchPortfolioImages(candidate);
      if (images.length === 0) {
        return {
          score: 0,
          strengths: [],
          gaps: ["No portfolio images available"],
          genreMatch: 0,
          verdict: "mismatch",
          summary: "Unable to evaluate — no images found",
        };
      }
      return await this.generateEvaluation(images);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        score: 0,
        strengths: [],
        gaps: [`Evaluation error: ${message}`],
        genreMatch: 0,
        verdict: "mismatch",
        summary: `Evaluation failed: ${message}`,
      };
    }
  }

  async fetchPortfolioImages(candidate: Candidate): Promise<string[]> {
    const url = candidate.sourceUrl;
    if (!url) return [];

    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) return [];
      const html = await res.text();

      const imgUrls = new Set<string>();
      const patterns = [
        /<img[^>]+src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
        /<img[^>]+src="([^"]+)"[^>]*class="[^"]*(?:art|work|portfolio|thumb|illust)[^"]*"/gi,
        /data-src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
        /<div[^>]+style="background-image:\s*url\(['"]?([^'" )]+)['"]?\)/gi,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const imgUrl = match[1].split("?")[0];
          if (imgUrl.startsWith("http")) {
            imgUrls.add(imgUrl);
          }
        }
      }

      return Array.from(imgUrls).slice(0, 10);
    } catch {
      return [];
    }
  }

  async generateEvaluation(images: string[]): Promise<Evaluation> {
    const model = this.env.WORKERS_AI_MODEL || "@cf/meta/llama-3.2-11b-vision-instruct";
    const content: any[] = [
      {
        type: "text",
        text: "You are evaluating a comic/manga creator's portfolio. Analyze the portfolio images and provide:\n- Score (0-100): Overall artistic quality and potential\n- Strengths: What they excel at (comma-separated)\n- Gaps: Areas needing improvement (comma-separated)\n- Genre match (0-100): How well their style fits Light Story's comic/manga platform\n- Verdict: strong_match, potential, or mismatch\n- Summary: 1-2 sentence assessment\n\nFormat your response as:\nSCORE: <number>\nSTRENGTHS: <comma-separated>\nGAPS: <comma-separated>\nGENRE_MATCH: <number>\nVERDICT: <strong_match|potential|mismatch>\nSUMMARY: <text>",
      },
      ...images.slice(0, 10).map((img) => ({
        type: "image_url",
        image_url: { url: img },
      })),
    ];

    const result: any = await this.env.AI.run(model, {
      messages: [{ role: "user", content }],
    });

    return this.parseEvaluation(result.response || result.text || "");
  }

  private parseEvaluation(text: string): Evaluation {
    const score = this.extractNumber(text, "SCORE:", 50);
    const strengths = this.extractList(text, "STRENGTHS:");
    const gaps = this.extractList(text, "GAPS:");
    const genreMatch = this.extractNumber(text, "GENRE_MATCH:", 50);
    const verdict = this.extractVerdict(text);
    const summary = this.extractText(text, "SUMMARY:");

    return {
      score: Math.max(0, Math.min(100, score)),
      strengths,
      gaps,
      genreMatch: Math.max(0, Math.min(100, genreMatch)),
      verdict,
      summary: summary || "No summary provided",
    };
  }

  private extractNumber(text: string, label: string, fallback: number): number {
    const regex = new RegExp(`${label}\\s*(\\d+)`, "i");
    const match = text.match(regex);
    return match ? parseInt(match[1], 10) : fallback;
  }

  private extractList(text: string, label: string): string[] {
    const regex = new RegExp(`${label}\\s*(.+)`, "i");
    const match = text.match(regex);
    if (!match) return [];
    return match[1].split(",").map((s) => s.trim()).filter(Boolean);
  }

  private extractVerdict(text: string): "strong_match" | "potential" | "mismatch" {
    const regex = /VERDICT:\s*(strong_match|potential|mismatch)/i;
    const match = text.match(regex);
    if (match) return match[1].toLowerCase() as "strong_match" | "potential" | "mismatch";
    const score = this.extractNumber(text, "SCORE:", -1);
    if (score >= 70) return "strong_match";
    if (score >= 40) return "potential";
    return "mismatch";
  }

  private extractText(text: string, label: string): string {
    const regex = new RegExp(`${label}\\s*(.+)`, "i");
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  }
}
