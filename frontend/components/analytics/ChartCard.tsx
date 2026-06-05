import type { ComponentChildren } from "preact";
import { Icon, Skeleton } from "../ui.tsx";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  accent?: string;
  children: ComponentChildren;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyBody?: string;
  height?: number;
  actions?: ComponentChildren;
  footer?: ComponentChildren;
};

export function ChartCard({
  title,
  subtitle,
  icon,
  accent = "var(--primary)",
  children,
  isLoading = false,
  isEmpty = false,
  emptyIcon = "insights",
  emptyTitle = "No data yet",
  emptyBody = "There is nothing to display right now.",
  height = 320,
  actions,
  footer,
}: ChartCardProps) {
  return (
    <section class="chart-card">
      <header class="chart-card-head">
        <div class="chart-card-title-wrap">
          {icon && (
            <div
              class="chart-card-icon"
              style={{
                background: `color-mix(in srgb, ${accent}, transparent 88%)`,
                color: accent,
              }}
            >
              <Icon name={icon} size={18} />
            </div>
          )}
          <div>
            <h3 class="chart-card-title">{title}</h3>
            {subtitle && <p class="chart-card-subtitle">{subtitle}</p>}
          </div>
        </div>
        {actions && <div class="chart-card-actions">{actions}</div>}
      </header>
      <div class="chart-card-body" style={{ minHeight: `${height}px` }}>
        {isLoading
          ? (
            <div class="chart-card-loading">
              <Skeleton height={height - 32} />
            </div>
          )
          : isEmpty
          ? (
            <div class="chart-card-empty">
              <div class="chart-card-empty-icon">
                <Icon name={emptyIcon} size={28} />
              </div>
              <h4 class="chart-card-empty-title">{emptyTitle}</h4>
              <p class="chart-card-empty-body">{emptyBody}</p>
            </div>
          )
          : children}
      </div>
      {footer && <footer class="chart-card-footer">{footer}</footer>}
    </section>
  );
}

type KpiCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon: string;
  accent?: string;
  trend?: { delta: number; label?: string };
  isLoading?: boolean;
};

export function KpiCard({
  label,
  value,
  hint,
  icon,
  accent = "var(--primary)",
  trend,
  isLoading = false,
}: KpiCardProps) {
  const trendUp = (trend?.delta ?? 0) >= 0;
  const trendColor = trendUp ? "var(--success)" : "var(--danger)";
  return (
    <div class="kpi-card">
      <div class="kpi-card-top">
        <div
          class="kpi-card-icon"
          style={{
            background: `color-mix(in srgb, ${accent}, transparent 88%)`,
            color: accent,
          }}
        >
          <Icon name={icon} size={20} />
        </div>
        {trend && (
          <div
            class="kpi-card-trend"
            style={{
              color: trendColor,
              background: `color-mix(in srgb, ${trendColor}, transparent 88%)`,
            }}
          >
            <Icon
              name={trendUp ? "trending_up" : "trending_down"}
              size={14}
            />
            <span>{Math.abs(trend.delta)}%</span>
          </div>
        )}
      </div>
      {isLoading
        ? (
          <div class="kpi-card-skel">
            <span class="kpi-skel-line short" />
            <span class="kpi-skel-line" />
          </div>
        )
        : (
          <>
            <p class="kpi-card-label">{label}</p>
            <strong class="kpi-card-value">{value}</strong>
            {hint && <p class="kpi-card-hint">{hint}</p>}
            {trend?.label && <p class="kpi-card-trend-label">{trend.label}</p>}
          </>
        )}
    </div>
  );
}
