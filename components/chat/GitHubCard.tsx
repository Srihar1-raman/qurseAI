'use client';

import React from 'react';
import { Github, Star, Users, ExternalLink } from 'lucide-react';

interface GitHubRepository {
  url: string;
  title: string;
  description: string;
  position: number;
  category: string;
}

interface GitHubSearchResult {
  results: GitHubRepository[];
}

interface GitHubSearchCardProps {
  result: GitHubSearchResult;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  const parts = url.split('/').filter(Boolean);
  return {
    owner: parts[parts.length - 2] || 'unknown',
    repo: parts[parts.length - 1] || 'unknown',
  };
}

export function GitHubSearchCard({ result }: GitHubSearchCardProps) {
  if (!result.results || result.results.length === 0) {
    return null;
  }

  return (
    <div className="github-card github-card-compact">
      <div className="github-card-header github-header-compact">
        <div className="github-card-title-section">
          <h3 className="github-card-title">GitHub</h3>
          <p className="github-card-subtitle">
            {result.results.length} repos found
          </p>
        </div>
      </div>

      <div className="github-horizontal-scroll">
        {result.results.map((repo, index) => {
          const { owner, repo: repoName } = parseGitHubUrl(repo.url);
          return (
            <a
              key={repo.url}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="github-repo-card"
            >
              <div className="github-repo-card-header">
                <Github size={16} className="github-repo-icon" />
                <div className="github-repo-names">
                  <span className="github-repo-owner">{owner}</span>
                  <span className="github-repo-separator">/</span>
                  <span className="github-repo-name">{repoName}</span>
                </div>
              </div>

              <p className="github-repo-description">{repo.description}</p>

              <div className="github-repo-meta">
                <div className="github-repo-meta-item">
                  <Star size={12} />
                  <span>Star</span>
                </div>
                <div className="github-repo-meta-item">
                  <Users size={12} />
                  <span>Fork</span>
                </div>
                <ExternalLink size={12} className="github-repo-link-icon" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
