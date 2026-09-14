'use client';

import * as React from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ============ Color palette (matches the ERP theme) ============
export const CHART_COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  slate: '#64748b',
  pink: '#ec4899',
};

export const CHART_PALETTE = [
  CHART_COLORS.emerald,
  CHART_COLORS.blue,
  CHART_COLORS.amber,
  CHART_COLORS.purple,
  CHART_COLORS.cyan,
  CHART_COLORS.pink,
  CHART_COLORS.red,
  CHART_COLORS.slate,
];

// ============ Tooltip styling ============
const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#fff',
  padding: '8px 12px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
};

// ============ Currency formatter for axes ============
const formatINR = (v: number) => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v));
const formatINRAxis = (v: number) => v >= 100000 ? '₹' + (v / 100000).toFixed(0) + 'L' : v >= 1000 ? '₹' + (v / 1000).toFixed(0) + 'k' : '₹' + v;

// ============ Bar Chart (generic) ============
export function ERPBarChart({
  data, xKey, bars, height = 260, showLegend = true, formatY = true,
}: {
  data: Record<string, any>[];
  xKey: string;
  bars: { key: string; label: string; color?: string }[];
  height?: number;
  showLegend?: boolean;
  formatY?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatY ? formatINRAxis : undefined}
          width={60}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, name: string) => [formatINR(Number(v)), name]}
          cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.label}
            fill={b.color || CHART_PALETTE[i % CHART_PALETTE.length]}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============ Area Chart (for cash flow) ============
export function ERPAreaChart({
  data, xKey, series, height = 260,
}: {
  data: Record<string, any>[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => {
            const color = s.color || CHART_PALETTE[i % CHART_PALETTE.length];
            return (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatINRAxis} width={60} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: string) => [formatINR(Number(v)), name]} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {series.map((s, i) => {
          const color = s.color || CHART_PALETTE[i % CHART_PALETTE.length];
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============ Line Chart ============
export function ERPLineChart({
  data, xKey, series, height = 260,
}: {
  data: Record<string, any>[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatINRAxis} width={60} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: string) => [formatINR(Number(v)), name]} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {series.map((s, i) => {
          const color = s.color || CHART_PALETTE[i % CHART_PALETTE.length];
          return (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============ Donut Chart (for category breakdowns) ============
export function ERPDonutChart({
  data, height = 260, innerRadius = 60, outerRadius = 90,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color || CHART_PALETTE[i % CHART_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: any, name: string) => [formatINR(Number(v)), name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
      {total > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: 0, height: '60%' }}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total</div>
          <div className="text-base font-black">{formatINR(total)}</div>
        </div>
      )}
    </div>
  );
}

// ============ Chart Card wrapper ============
export function ChartCard({
  title, subtitle, actions, children, className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden shadow-sm ${className || ''}`}>
      <div className="flex items-center justify-between p-3.5 border-b border-border">
        <div>
          <div className="text-sm font-bold">{title}</div>
          {subtitle && <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
        {actions}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
