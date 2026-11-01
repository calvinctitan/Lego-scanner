import type { ReactNode } from 'react';

import { FAN_NOTICE } from '@/components/hero';
import { Reveal, RevealHeading } from '@/components/reveal';

const LICENSES = `${import.meta.env.BASE_URL}third-party-licenses.txt`;

export function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-title" className="border-t border-border">
      <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6 md:py-24">
        <RevealHeading id="about-title" className="text-[clamp(38px,5.4vw,68px)] leading-[0.95] font-[860] tracking-[-0.03em] [font-stretch:116%]">
          About Legará
        </RevealHeading>
        <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          <Block title="A fan project" delay={0}>
            {FAN_NOTICE} Star Wars, Harry Potter, Marvel, DC, The Lord of the Rings, NINJAGO, BrickLink, eBay and all
            character and product names belong to their owners, who don’t sponsor or endorse Legará. Names are used only to
            identify the figures.
          </Block>
          <Block title="Prices" delay={0.1}>
            Market prices are rough estimates of what complete, used figures have sold for on eBay and BrickLink. Scan prices
            are an AI’s estimate. Neither is a live price or an offer to sell, and either can be wrong: check recent sold
            listings before you buy or sell. Legará doesn’t sell anything or take payments.
          </Block>
          <Block title="Privacy" delay={0.2}>
            No accounts, ads, cookies or tracking. This browser remembers your access code, how many scans you’ve done, your
            shelf and the figures you viewed lately, and none of that leaves your device. A scan’s photo goes to the Legará server and the AI service it uses (Cloudflare Workers AI or
            Anthropic’s Claude) to estimate the price, and isn’t kept by Legará. The site is hosted by GitHub Pages, which logs
            visitors’ IP addresses for security.
          </Block>
        </div>
        <p className="mt-12 max-w-[60rem] text-[14px] leading-[1.6] text-muted-foreground">
          Built with React, Tailwind CSS, Radix, Framer Motion, three.js and Lenis. Type: Archivo (SIL Open Font License). Icons: Lucide (ISC
          License). Scanning can use Meta’s Llama 4 model through Cloudflare Workers AI (Built with Llama) or Anthropic’s
          Claude. The stud artwork is original to Legará. Full license texts:{' '}
          <a href={LICENSES} className="text-link underline-offset-4 hover:underline">
            third-party-licenses.txt
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function Block({ title, children, delay }: { title: string; children: ReactNode; delay: number }) {
  return (
    <Reveal delay={delay}>
      <h3 className="text-[20px] font-[760] [font-stretch:110%]">{title}</h3>
      <p className="mt-3 max-w-[38ch] text-[16px] leading-[1.6] text-muted-foreground">{children}</p>
    </Reveal>
  );
}
