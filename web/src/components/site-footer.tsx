import HalftoneWordmarkFooter, { type FooterColumn } from '@/components/ui/halftone-wordmark-footer';
import { useMediaQuery } from '@/hooks/use-media-query';

const ARCHIVO = '"Archivo Variable", "Archivo", "Helvetica Neue", Arial, system-ui, sans-serif';

const COLUMNS: FooterColumn[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Market', href: '#market' },
      { label: 'Scan a figure', href: '#scan' },
      { label: 'About', href: '#about' },
      { label: 'Play the intro again', href: `${import.meta.env.BASE_URL}?intro=1` },
    ],
  },
  {
    title: 'Buy figures on',
    links: [
      { label: 'BrickLink', href: 'https://www.bricklink.com/', external: true },
      { label: 'eBay', href: 'https://www.ebay.com/', external: true },
    ],
  },
  {
    title: 'The project',
    links: [
      { label: 'Source code', href: 'https://github.com/calvinctitan/Lego-scanner', external: true },
      { label: 'Licenses', href: `${import.meta.env.BASE_URL}third-party-licenses.txt` },
    ],
  },
];

/** The halftone footer, set in Legará's wordmark as yellow studs on a black baseplate. */
export function SiteFooter() {
  // On a phone the word is small, so smaller studs keep the letters readable.
  const narrow = useMediaQuery('(max-width: 720px)');
  return (
    <HalftoneWordmarkFooter
      wordmark="legará"
      label="Legará"
      meta="An unofficial fan project, not made or endorsed by the LEGO Group."
      columns={COLUMNS}
      preset="baseplate"
      studs
      dotGap={narrow ? 5 : 9}
      radius={narrow ? 56 : 96}
      crop={0.16}
      grain={0.35}
      fontFamily={ARCHIVO}
      fontWeight={900}
      fontStretch="expanded"
      monoFamily={ARCHIVO}
      // Tall enough on phones for the stacked link columns to sit clear of the wordmark.
      height="max(500px, min(44vw, 560px))"
    />
  );
}
