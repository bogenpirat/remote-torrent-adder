export default function Notice({ title, children, tone }: { title: string; children: React.ReactNode; tone?: 'error' }) {
  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-sm mx-auto space-y-2 text-center">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className={tone === 'error' ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
          {children}
        </p>
      </div>
    </div>
  );
}
