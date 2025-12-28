import { NextRequest, NextResponse } from "next/server";

type ParsedGitHubUrl = {
  owner: string;
  repo: string;
  type: "repo" | "issue" | "pull" | "user";
  number?: number;
};

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

const getGitHubHeaders = () => {
  const headers: Record<string, string> = {
    "User-Agent": "nounspace",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseGitHubUrl = (rawUrl: string): ParsedGitHubUrl | null => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
      return null;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    const blockedUserSlugs = new Set([
      "explore",
      "topics",
      "settings",
      "marketplace",
      "about",
      "pricing",
      "features",
      "collections",
      "sponsors",
      "orgs",
      "users",
    ]);

    if (parts.length === 1) {
      const owner = parts[0];
      if (!owner || blockedUserSlugs.has(owner)) return null;
      return { owner, repo: "", type: "user" };
    }

    if (parts[0] === "orgs" || parts[0] === "users") {
      const owner = parts[1];
      if (!owner) return null;
      return { owner, repo: "", type: "user" };
    }

    const owner = parts[0];
    const repo = parts[1]?.replace(/\.git$/, "");
    if (!owner || !repo) return null;

    const section = parts[2];
    const number = parts[3] ? Number(parts[3]) : undefined;

    if ((section === "issues" || section === "pull" || section === "pulls") && number && Number.isFinite(number)) {
      return {
        owner,
        repo,
        type: section === "issues" ? "issue" : "pull",
        number,
      };
    }

    return { owner, repo, type: "repo" };
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return NextResponse.json({ error: "Unsupported GitHub URL" }, { status: 400 });
  }

  const headers = getGitHubHeaders();

  try {
    if (parsed.type === "user") {
      const userResponse = await fetch(
        `https://api.github.com/users/${parsed.owner}`,
        { headers, next: { revalidate: 300 } }
      );

      if (!userResponse.ok) {
        return NextResponse.json({ error: "Failed to fetch user" }, { status: userResponse.status, headers: cacheHeaders });
      }

      const user = await userResponse.json();

      return NextResponse.json(
        {
          type: "user",
          url: user.html_url,
          user: {
            login: user.login,
            name: user.name,
            bio: user.bio,
            avatarUrl: user.avatar_url,
            followers: user.followers,
            following: user.following,
            publicRepos: user.public_repos,
            company: user.company,
            location: user.location,
          },
        },
        { headers: cacheHeaders }
      );
    }

    if (parsed.type === "repo") {
      const repoResponse = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
        { headers, next: { revalidate: 300 } }
      );

      if (!repoResponse.ok) {
        return NextResponse.json({ error: "Failed to fetch repo" }, { status: repoResponse.status, headers: cacheHeaders });
      }

      const repo = await repoResponse.json();

      return NextResponse.json(
        {
          type: "repo",
          url: repo.html_url,
          repo: {
            owner: repo.owner?.login,
            name: repo.name,
            fullName: repo.full_name,
            url: repo.html_url,
            avatarUrl: repo.owner?.avatar_url,
          },
          description: repo.description,
          language: repo.language,
          topics: Array.isArray(repo.topics) ? repo.topics : [],
          license: repo.license?.spdx_id ?? null,
          isFork: repo.fork,
          isPrivate: repo.private,
          isArchived: repo.archived,
          stats: {
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            issues: repo.open_issues_count,
            watchers: repo.watchers_count,
          },
          updatedAt: repo.updated_at,
        },
        { headers: cacheHeaders }
      );
    }

    const issueResponse = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.number}`,
      { headers, next: { revalidate: 300 } }
    );

    if (!issueResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch issue" }, { status: issueResponse.status, headers: cacheHeaders });
    }

    const issue = await issueResponse.json();
    const isPullRequest = !!issue.pull_request || parsed.type === "pull";
    let merged = false;
    let draft = false;

    if (isPullRequest) {
      const prResponse = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.number}`,
        { headers, next: { revalidate: 300 } }
      );
      if (prResponse.ok) {
        const pr = await prResponse.json();
        merged = !!pr.merged_at;
        draft = !!pr.draft;
      }
    }

    return NextResponse.json(
      {
        type: isPullRequest ? "pull" : "issue",
        url: issue.html_url,
        repo: {
          owner: parsed.owner,
          name: parsed.repo,
          fullName: `${parsed.owner}/${parsed.repo}`,
          url: `https://github.com/${parsed.owner}/${parsed.repo}`,
          avatarUrl: issue.repository?.owner?.avatar_url,
        },
        issue: {
          number: issue.number,
          title: issue.title,
          state: issue.state,
          comments: issue.comments,
          updatedAt: issue.updated_at,
          author: issue.user
            ? {
                login: issue.user.login,
                avatarUrl: issue.user.avatar_url,
                url: issue.user.html_url,
              }
            : null,
          labels: Array.isArray(issue.labels)
            ? issue.labels
                .map((label: { name?: string; color?: string }) => ({
                  name: label.name || "",
                  color: label.color || "6b7280",
                }))
                .filter((label: { name: string }) => !!label.name)
            : [],
          isMerged: merged,
          isDraft: draft,
        },
      },
      { headers: cacheHeaders }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch GitHub data" }, { status: 500, headers: cacheHeaders });
  }
}
