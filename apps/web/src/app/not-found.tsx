import Link from "next/link";
import { Section } from "@/components/ui/section";
import { Display, Eyebrow, Lead } from "@/components/ui/typography";
import { btn } from "@/components/ui/button-variants";

export default function NotFound() {
  return (
    <Section pad="section" rule={false} grid>
      <Eyebrow>404 · Not found</Eyebrow>
      <Display as="h1" size="xl" lines={["No signal", "here."]} accentFrom={1} />
      <Lead className="mt-6">That page doesn&apos;t exist. The dashboard has every run.</Lead>
      <Link href="/" className={`${btn("primary", "lg")} mt-8`}>
        Back to dashboard <span className="tc-arrow">→</span>
      </Link>
    </Section>
  );
}
