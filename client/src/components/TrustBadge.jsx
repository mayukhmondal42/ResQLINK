const STATE_STYLES = {
  pending: { label: 'Pending', className: 'border-console-muted/40 text-console-muted' },
  suspicious: { label: 'Suspicious', className: 'border-severity-critical/50 text-severity-critical' },
  verified: { label: 'Verified', className: 'border-severity-low/50 text-severity-low' },
  highly_trusted: { label: 'Highly Trusted', className: 'border-severity-info/50 text-severity-info' },
};

export default function TrustBadge({ verification }) {
  if (!verification) return null;
  const style = STATE_STYLES[verification.trustState] || STATE_STYLES.pending;

  return (
    <span
      title={`GPS ${verification.gpsScore} · Crowd ${verification.crowdScore} · Authority ${verification.authorityScore} · AI ${verification.aiScore}`}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${style.className}`}
    >
      {style.label} · {verification.trustScore}
    </span>
  );
}
