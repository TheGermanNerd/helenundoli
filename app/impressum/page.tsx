import type { Metadata } from "next";
import { LegalLink, LegalPage, LegalSection } from "@/components/legal-page";
import { operator } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Impressum · Helen & Oliver",
  description: "Impressum der Hochzeitseinladung von Helen und Oliver.",
};

export default function ImpressumPage() {
  return (
    <LegalPage kicker="Angaben" title="Impressum">
      <LegalSection title="Anbieter">
        <p>Angaben gemäß § 5 DDG</p>
        <OperatorAddress />
        <p>
          E-Mail: <LegalLink href={`mailto:${operator.email}`}>{operator.email}</LegalLink>
        </p>
      </LegalSection>
      <LegalSection title="Verantwortlich für den Inhalt">
        <p>Verantwortlich nach § 18 Abs. 2 MStV ist:</p>
        <OperatorAddress />
      </LegalSection>
      <LegalSection title="Art des Angebots">
        <p>
          Diese Website ist eine private Einladung zur Hochzeit von Helen und Oliver. Sie wird nicht geschäftsmäßig und
          nicht gegen Entgelt betrieben. Ein Eintrag im Handelsregister und eine Umsatzsteuer-Identifikationsnummer
          bestehen nicht.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

function OperatorAddress() {
  return (
    <address className="not-italic">
      {operator.name}
      <br />
      {operator.street}
      <br />
      {operator.postalCode} {operator.city}
    </address>
  );
}
