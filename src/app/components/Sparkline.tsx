'use client';
// ============================================================
// PayGuard — Sparkline Chart (SVG-based mini trend chart)
// ============================================================

interface SparklineProps {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  showArea?: boolean;
  labels?: string[];
}

export default function Sparkline({
  values,
  width = 200,
  height = 50,
  color = '#6366f1',
  showDots = true,
  showArea = true,
  labels,
}: SparklineProps) {
  // Filter out nulls and track their indices
  const validPoints: { index: number; value: number }[] = [];
  values.forEach((v, i) => {
    if (v !== null && v !== undefined) validPoints.push({ index: i, value: v });
  });

  if (validPoints.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
        Données insuffisantes
      </div>
    );
  }

  const padding = 8;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const min = Math.min(...validPoints.map(p => p.value));
  const max = Math.max(...validPoints.map(p => p.value));
  const range = max - min || 1;

  const scaleX = (index: number) => padding + (index / (values.length - 1)) * innerWidth;
  const scaleY = (value: number) => padding + innerHeight - ((value - min) / range) * innerHeight;

  const points = validPoints.map(p => ({
    x: scaleX(p.index),
    y: scaleY(p.value),
    value: p.value,
    index: p.index,
  }));

  // SVG path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area path (fill below line)
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  // Determine trend
  const first = validPoints[0].value;
  const last = validPoints[validPoints.length - 1].value;
  const variation = ((last - first) / first) * 100;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Area fill */}
        {showArea && (
          <path d={areaD} fill={color} opacity={0.1} />
        )}

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {showDots && points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} stroke="var(--bg-card)" strokeWidth={1.5} />
        ))}
      </svg>

      {/* Trend label */}
      <span style={{
        position: 'absolute', top: '-2px', right: '0', fontSize: '0.7rem', fontWeight: 600,
        color: variation > 5 ? '#22c55e' : variation < -5 ? '#ef4444' : 'var(--text-secondary)',
      }}>
        {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
      </span>

      {/* Tooltip labels */}
      {labels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}
