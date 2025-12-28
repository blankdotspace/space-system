import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import OpenGraphEmbed from "./OpenGraphEmbed";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import { formatTimeAgo } from "@/common/lib/utils/date";

type GitHubLabel = {
  name: string;
  color: string;
};

type GitHubRepo = {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  avatarUrl?: string;
};

type GitHubIssue = {
  number: number;
  title: string;
  state: "open" | "closed";
  comments: number;
  updatedAt?: string;
  author?: {
    login: string;
    avatarUrl: string;
    url: string;
  } | null;
  labels?: GitHubLabel[];
  isMerged?: boolean;
  isDraft?: boolean;
};

type GitHubEmbedData = {
  type: "repo" | "issue" | "pull" | "user";
  url: string;
  repo?: GitHubRepo;
  description?: string;
  language?: string | null;
  topics?: string[];
  license?: string | null;
  isFork?: boolean;
  isPrivate?: boolean;
  isArchived?: boolean;
  stats?: {
    stars?: number;
    forks?: number;
    issues?: number;
    watchers?: number;
  };
  updatedAt?: string;
  issue?: GitHubIssue;
  user?: {
    login: string;
    name?: string;
    bio?: string;
    avatarUrl?: string;
    followers?: number;
    following?: number;
    publicRepos?: number;
    company?: string | null;
    location?: string | null;
  };
};

export const isGitHubUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "github.com" || parsed.hostname === "www.github.com";
  } catch {
    return false;
  }
};

const formatCount = (value?: number) => {
  if (value === undefined || value === null) return null;
  if (value < 1000) return `${value}`;
  if (value < 1000000) {
    const rounded = Math.round((value / 1000) * 10) / 10;
    return `${rounded}`.replace(/\.0$/, "") + "k";
  }
  const rounded = Math.round((value / 1000000) * 10) / 10;
  return `${rounded}`.replace(/\.0$/, "") + "m";
};

const getLabelTextColor = (hex: string) => {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return "#111827";
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  return luminance > 186 ? "#111827" : "#ffffff";
};

const languageColor = (language?: string | null) => {
  if (!language) return "#94a3b8";
  let hash = 0;
  for (let i = 0; i < language.length; i += 1) {
    hash = (hash << 5) - hash + language.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 45%)`;
};

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    width="16"
    height="16"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
    />
  </svg>
);

const cardClasses =
  "relative w-full rounded-xl border border-foreground/15 bg-background/70 p-4 shadow-sm";

const ExternalLinkButton = ({ url, label = "Open" }: { url: string; label?: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-foreground/15 bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground/70 shadow-sm transition-colors hover:border-foreground/30 hover:text-foreground"
  >
    {label}
    <span aria-hidden="true">↗</span>
  </a>
);

const GitHubEmbed: React.FC<{ url: string }> = ({ url }) => {
  const [data, setData] = useState<GitHubEmbedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setData(null);

        const response = await fetch(`/api/github?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch GitHub data: ${response.statusText}`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const updatedLabel = useMemo(() => {
    const updatedAt = data?.issue?.updatedAt || data?.updatedAt;
    if (!updatedAt) return null;
    return formatTimeAgo(new Date(updatedAt));
  }, [data?.issue?.updatedAt, data?.updatedAt]);

  if (isLoading) {
    return (
      <div className="w-full rounded-xl border border-foreground/15 bg-background/50 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded bg-foreground/10" />
          <div className="h-3 w-2/3 rounded bg-foreground/10" />
          <div className="h-3 w-1/2 rounded bg-foreground/10" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <OpenGraphEmbed url={url} />;
  }

  if (data.type === "user" && data.user) {
    const name = data.user.name || data.user.login;
    const metaParts = [data.user.company, data.user.location].filter(Boolean);
    return (
      <div className="w-full">
        <div className={cardClasses}>
          <ExternalLinkButton url={data.url} label="Open" />
          <div className="flex items-start gap-3">
            {data.user.avatarUrl && (
              <Image
                src={data.user.avatarUrl}
                alt={`${data.user.login} avatar`}
                width={52}
                height={52}
                className="rounded-full ring-2 ring-foreground/10"
              />
            )}
            <div className="min-w-0 flex-1 pr-12">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/60">
                <GitHubIcon className="h-3.5 w-3.5" />
                GitHub Profile
              </div>
              <div className="mt-0.5 font-semibold text-foreground truncate">{name}</div>
              <div className="text-xs text-foreground/60">@{data.user.login}</div>
              {metaParts.length > 0 && (
                <div className="mt-1 text-xs text-foreground/60">
                  {metaParts.join(" • ")}
                </div>
              )}
            </div>
          </div>
          {data.user.bio && (
            <div className="mt-2 text-sm text-foreground/70 line-clamp-2">{data.user.bio}</div>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground/70">
            {data.user.publicRepos !== undefined && <span>Repos {formatCount(data.user.publicRepos)}</span>}
            {data.user.followers !== undefined && <span>Followers {formatCount(data.user.followers)}</span>}
            {data.user.following !== undefined && <span>Following {formatCount(data.user.following)}</span>}
          </div>
        </div>
      </div>
    );
  }

  const repo = data.repo;
  if (!repo) {
    return <OpenGraphEmbed url={url} />;
  }

  const repoTitle = repo.fullName || `${repo.owner}/${repo.name}`;
  const stats = data.stats || {};
  const repoBadges = [
    data.isPrivate ? "Private" : null,
    data.isArchived ? "Archived" : null,
    data.isFork ? "Fork" : null,
  ].filter(Boolean) as string[];

  if (data.type === "repo") {
    return (
      <div className="w-full">
        <div className={cardClasses}>
          <ExternalLinkButton url={data.url} label="Open" />
          <div className="flex items-start gap-3">
            {repo.avatarUrl && (
              <Image
                src={repo.avatarUrl}
                alt={`${repo.owner} avatar`}
                width={36}
                height={36}
                className="rounded-full ring-2 ring-foreground/10"
              />
            )}
            <div className="min-w-0 pr-12">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/60">
                <GitHubIcon className="h-3.5 w-3.5" />
                GitHub Repository
              </div>
              <div className="font-semibold text-foreground truncate">{repoTitle}</div>
              {repoBadges.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {repoBadges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/70"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {data.description && (
            <div className="mt-2 text-sm text-foreground/70 line-clamp-2">{data.description}</div>
          )}
          {data.topics && data.topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.topics.slice(0, 3).map((topic) => (
                <span
                  key={topic}
                  className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/70"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground/70">
            {data.language && (
              <span className="inline-flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: languageColor(data.language) }}
                />
                {data.language}
              </span>
            )}
            {data.license && data.license !== "NOASSERTION" && <span>License {data.license}</span>}
            {stats.stars !== undefined && <span>Stars {formatCount(stats.stars)}</span>}
            {stats.forks !== undefined && <span>Forks {formatCount(stats.forks)}</span>}
            {stats.issues !== undefined && <span>Issues {formatCount(stats.issues)}</span>}
            {stats.watchers !== undefined && <span>Watchers {formatCount(stats.watchers)}</span>}
            {updatedLabel && <span>Updated {updatedLabel}</span>}
          </div>
        </div>
      </div>
    );
  }

  const issue = data.issue;
  if (!issue) {
    return <OpenGraphEmbed url={url} />;
  }

  const stateLabel = issue.isMerged
    ? "Merged"
    : issue.state === "open"
      ? "Open"
      : "Closed";

  const stateClass = issue.isMerged
    ? "bg-emerald-500/15 text-emerald-600"
    : issue.state === "open"
      ? "bg-blue-500/15 text-blue-600"
      : "bg-gray-500/15 text-gray-600";

  return (
    <div className="w-full">
      <div className={cardClasses}>
        <ExternalLinkButton url={data.url} label="Open" />
        <div className="flex flex-wrap items-center gap-2 pr-12 text-xs text-foreground/70">
          <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-foreground/80">
            {data.type === "pull" ? "Pull Request" : "Issue"}
          </span>
          <span className={mergeClasses("rounded-full px-2 py-0.5", stateClass)}>
            {stateLabel}
          </span>
          {issue.isDraft && (
            <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-foreground/70">
              Draft
            </span>
          )}
        </div>
        <div className="mt-2 flex items-start gap-2">
          {issue.author?.avatarUrl && (
            <Image
              src={issue.author.avatarUrl}
              alt={`${issue.author.login} avatar`}
              width={28}
              height={28}
              className="rounded-full ring-2 ring-foreground/10"
            />
          )}
          <div className="min-w-0 pr-12">
            <div className="font-semibold text-foreground line-clamp-2">{issue.title}</div>
            <div className="mt-0.5 text-xs text-foreground/60">
              {repoTitle} #{issue.number}
              {issue.author?.login ? ` by ${issue.author.login}` : ""}
            </div>
          </div>
        </div>
        {issue.labels && issue.labels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {issue.labels.slice(0, 3).map((label) => (
              <span
                key={label.name}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: `#${label.color}`,
                  color: getLabelTextColor(label.color),
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-foreground/70">
          <span>Comments: {issue.comments}</span>
          {updatedLabel && <span>Updated: {updatedLabel}</span>}
        </div>
      </div>
    </div>
  );
};

export default GitHubEmbed;
