import React from "react";
import { SidebarView, AnalysisMode } from "../../shared/types";

interface TabBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  mode: AnalysisMode;
  linkCount?: number;
}

interface TabConfig {
  id: SidebarView;
  label: string;
  icon: React.ReactNode;
}

export default function TabBar({ activeView, onViewChange, mode, linkCount }: TabBarProps) {
  const linksLabel = linkCount !== undefined && linkCount > 0 ? `Links (${linkCount})` : "Links";

  const tabs: TabConfig[] = [
    { id: "summary", label: "Summary", icon: <SummaryIcon /> },
    { id: "evidence", label: "Evidence", icon: <EvidenceIcon /> },
    { id: "links", label: linksLabel, icon: <LinksIcon /> },
  ];

  return (
    <div
      style={{
        display: "flex",
        borderTop: "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg-surface)",
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              padding: "10px 4px 8px",
              background: "transparent",
              border: "none",
              borderTop: isActive
                ? "2px solid var(--brand-purple)"
                : "2px solid transparent",
              cursor: "pointer",
              color: isActive ? "var(--brand-purple)" : "var(--text-muted)",
              transition: "color 0.15s, border-color 0.15s",
              minWidth: 0,
            }}
          >
            <span
              style={{
                display: "flex",
                color: isActive ? "var(--brand-purple)" : "var(--text-secondary)",
              }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--brand-purple)" : "var(--text-secondary)",
                textAlign: "center",
                whiteSpace: "pre-line",
                lineHeight: 1.2,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SummaryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 1.5L2 4.75V9C2 12.75 5.1 16.275 9 17.25C12.9 16.275 16 12.75 16 9V4.75L9 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EvidenceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 6v4M9 12v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function LinksIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M7 11L11 7M8.5 5.5l1-1a3.536 3.536 0 015 5l-1 1M9.5 12.5l-1 1a3.536 3.536 0 01-5-5l1-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
