const LINKS = [
  { href: '#market', label: 'Market' },
  { href: '#scan', label: 'Scan' },
  { href: '#about', label: 'About' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-md">
      <a
        href="#market"
        className="absolute top-2 left-2 -translate-y-16 rounded-md bg-foreground px-3 py-2 text-sm text-background focus-visible:translate-y-0"
      >
        Skip to the market
      </a>
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-4 sm:px-6">
        <a href="#top" className="text-[24px] leading-none font-[900] tracking-[-0.02em] [font-stretch:125%]" aria-label="Legará, back to the top">
          legará
        </a>
        <nav aria-label="Sections">
          <ul className="flex items-center gap-1 text-[15px] font-medium">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
