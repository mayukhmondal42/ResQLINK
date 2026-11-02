const CONTACTS = [
  { label: 'National Emergency Number', number: '112' },
  { label: 'Police', number: '100' },
  { label: 'Fire Brigade', number: '101' },
  { label: 'Ambulance', number: '108' },
  { label: 'Disaster Management Helpline (NDMA)', number: '1078' },
  { label: 'Women Helpline', number: '1091' },
];

export default function EmergencyContacts() {
  return (
    <div className="rounded-lg border border-console-border bg-console-surface p-4">
      <p className="font-mono text-xs uppercase tracking-wide text-console-muted">Emergency contacts</p>
      <p className="mt-1 text-xs text-console-muted">
        If the situation is life-threatening, call directly — don't wait for a dispatch response.
      </p>
      <ul className="mt-3 space-y-2">
        {CONTACTS.map((c) => (
          <li key={c.number} className="flex items-center justify-between gap-2">
            <span className="text-sm text-console-mist">{c.label}</span>
            <a
              href={`tel:${c.number}`}
              className="rounded-md border border-brand px-3 py-1 font-mono text-sm font-semibold text-brand hover:bg-brand hover:text-white"
            >
              {c.number}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
