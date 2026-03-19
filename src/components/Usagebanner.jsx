/**
 * UsageBanner.jsx
 *
 * Drop this anywhere in your layout (e.g. inside AdminLayout, above the sidebar content).
 * It:
 *  - Shows a trial countdown banner if on free plan
 *  - Shows an "expired" lock banner if subscription is expired
 *  - Shows per-resource usage bars (staff, projects, tasks, etc.)
 *  - Shows an upgrade prompt when any limit is hit
 *
 * Usage:
 *   import UsageBanner from "../components/UsageBanner";
 *   <UsageBanner />
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const RESOURCE_LABELS = {
  staff:        "Staff",
  projects:     "Projects",
  tasks:        "Tasks",
  issues:       "Issues",
  documents:    "Documents",
  taskStatuses: "Task Statuses",
};

const RESOURCE_ICONS = {
  staff:        "👥",
  projects:     "📁",
  tasks:        "✅",
  issues:       "🐛",
  documents:    "📄",
  taskStatuses: "🏷️",
};

export default function UsageBanner() {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || isSuperAdmin) { setLoading(false); return; }
    fetchUsage();
  }, [user, isSuperAdmin]);

  const fetchUsage = async () => {
    try {
      const res = await api.get("/subscription/usage");
      setData(res.data);
    } catch {
      // silently fail — don't crash the layout
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data || isSuperAdmin) return null;

  const { summary, plan, isExpired, daysRemaining } = data;
  const isTrial    = plan?.name === "free";
  const isWarning  = daysRemaining <= 7 && daysRemaining > 0 && isTrial;
  const anyExceeded = summary?.some(s => s.exceeded);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* ── Expired banner ─────────────────────────────────────────────────── */}
      {isExpired && (
        <div style={styles.banner("#7f1d1d", "#fef2f2", "#fca5a5")}>
          <span>🔒 Your subscription has expired. New additions are blocked.</span>
          <button onClick={() => navigate("/admin/billing")} style={styles.bannerBtn("#dc2626")}>
            Choose a Plan
          </button>
        </div>
      )}

      {/* ── Trial countdown banner ─────────────────────────────────────────── */}
      {!isExpired && isTrial && (
        <div style={styles.banner(
          isWarning ? "#78350f" : "#1e3a5f",
          isWarning ? "#fffbeb" : "#eff6ff",
          isWarning ? "#fcd34d" : "#93c5fd",
        )}>
          <span>
            {isWarning ? "⚠️" : "🕐"}{" "}
            {daysRemaining > 0
              ? `Free trial: ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
              : "Your free trial has ended"}
          </span>
          <button
            onClick={() => navigate("/admin/billing")}
            style={styles.bannerBtn(isWarning ? "#d97706" : "#2563eb")}
          >
            Upgrade Now
          </button>
        </div>
      )}

      {/* ── Usage bars ────────────────────────────────────────────────────── */}
      {summary?.length > 0 && (
        <div style={styles.usageBox}>
          <div style={styles.usageHeader}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {plan?.displayName || "Free"} Plan — Usage
            </span>
            {anyExceeded && (
              <button onClick={() => navigate("/admin/billing")} style={styles.upgradeSmall}>
                ⚡ Upgrade
              </button>
            )}
          </div>

          <div style={styles.barsGrid}>
            {summary.map(item => (
              <UsageBar key={item.resource} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsageBar({ item }) {
  const { resource, used, limit, unlimited, exceeded } = item;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const color = exceeded ? "#dc2626" : pct >= 80 ? "#d97706" : "#16a34a";

  return (
    <div style={{ minWidth: 140 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
        <span>{RESOURCE_ICONS[resource]} {RESOURCE_LABELS[resource]}</span>
        <span style={{ color, fontWeight: 600 }}>
          {unlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div style={{ height: 5, background: "#e5e7eb", borderRadius: 99 }}>
          <div style={{
            height: "100%", borderRadius: 99,
            width: `${pct}%`,
            background: color,
            transition: "width 0.4s",
          }} />
        </div>
      )}
    </div>
  );
}

// ── Inline style helpers ───────────────────────────────────────────────────────
const styles = {
  banner: (color, bg, border) => ({
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 16px", marginBottom: 8, borderRadius: 8,
    background: bg, border: `1px solid ${border}`,
    color, fontSize: 13, fontWeight: 500, gap: 12,
  }),
  bannerBtn: (bg) => ({
    background: bg, color: "#fff", border: "none",
    borderRadius: 6, padding: "5px 12px", fontSize: 12,
    fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  }),
  usageBox: {
    background: "#f8fafc", border: "1px solid #e2e8f0",
    borderRadius: 8, padding: "10px 14px", marginBottom: 8,
  },
  usageHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  barsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "10px 20px",
  },
  upgradeSmall: {
    background: "#7c3aed", color: "#fff", border: "none",
    borderRadius: 5, padding: "3px 10px", fontSize: 11,
    fontWeight: 600, cursor: "pointer",
  },
};