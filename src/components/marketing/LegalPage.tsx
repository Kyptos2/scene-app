const EFFECTIVE_DATE = "August 1, 2026";

export function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-serif text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-1 mb-8 text-xs text-muted">Effective {EFFECTIVE_DATE}</p>
      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="mb-1.5 text-sm font-bold text-tint">{section.heading}</h2>
            <p className="text-sm leading-6 text-foreground/80">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
