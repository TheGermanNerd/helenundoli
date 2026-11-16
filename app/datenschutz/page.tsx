import type { Metadata } from "next";
import { LegalLink, LegalPage, LegalSection } from "@/components/legal-page";
import { operator, storageNotes } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Datenschutz · Helen & Oliver",
  description: "Datenschutzerklärung der Hochzeitseinladung von Helen und Oliver.",
};

export default function DatenschutzPage() {
  return (
    <LegalPage kicker="Eure Daten" title="Datenschutz">
      <LegalSection title="Verantwortlicher">
        <p>
          Verantwortlich für die Verarbeitung auf dieser Website ist {operator.name}, {operator.street},{" "}
          {operator.postalCode} {operator.city}. E-Mail:{" "}
          <LegalLink href={`mailto:${operator.email}`}>{operator.email}</LegalLink>
        </p>
        <p>Stand: 16. November 2026.</p>
      </LegalSection>

      <LegalSection title="Worum es geht">
        <p>
          Diese Website ist die private Einladung zur Hochzeit von Helen und Oliver. Sie ist mit einem Zugangscode für
          geladene Gäste geschützt. Wir verarbeiten Daten, um die Einladung anzuzeigen, Zusagen entgegenzunehmen, Fotos
          zu teilen und das Spiel zu ermöglichen.
        </p>
        <p>
          Schriftarten liefert unser eigener Server aus. Karten sind gewöhnliche Links, keine eingebetteten Karten. Es
          gibt keine Analyse- und keine Werbe-Cookies.
        </p>
      </LegalSection>

      <LegalSection title="Hosting und Verbindungsdaten">
        <p>
          Die Website läuft auf dem Server, auf dem sie betrieben wird. Beim Aufruf kann dieser Server die IP-Adresse,
          Datum und Uhrzeit, die aufgerufene Seite und Angaben zum Browser in einem Protokoll speichern. Das brauchen
          wir, um die Seite auszuliefern und sie vor Missbrauch zu schützen.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse ist der sichere Betrieb der
          Einladung. Die Protokolle bleiben nur so lange erhalten, wie sie dafür nötig sind. Eine Übermittlung in ein
          Land außerhalb der EU ist nicht vorgesehen. Die Daten bleiben auf diesem Server. Einen gesonderten
          Auftragsverarbeiter setzen wir dafür nicht ein.
        </p>
      </LegalSection>

      <LegalSection title="Speicherungen im Browser">
        <p>
          Wir speichern im Browser nur, was die Website zum Funktionieren braucht. Dafür ist nach § 25 Abs. 2 Nr. 2
          TDDDG keine Einwilligung nötig. Ihr könnt diese Einträge im Browser löschen. Danach fragt die Einladung wieder
          nach dem Zugangscode, und dieser Hinweis erscheint erneut.
        </p>
        <dl className="space-y-4">
          {storageNotes.map((entry) => (
            <div key={entry.name}>
              <dt className="font-medium">{entry.name}</dt>
              <dd className="mt-1 text-ink-soft">
                {entry.where}. {entry.purpose} Dauer: {entry.duration}.
              </dd>
            </div>
          ))}
        </dl>
        <p>
          Das Zugangs-Cookie, das Admin-Cookie, der Hinweis zum Datum und die Bestätigung dieses Hinweises stützen sich
          auf Art. 6 Abs. 1 lit. f DSGVO. Das Spiel-Cookie setzen wir erst, wenn ihr selbst am Spiel teilnehmt. Dafür
          ist Art. 6 Abs. 1 lit. a DSGVO die Grundlage, weil ihr uns die Daten dafür schickt.
        </p>
      </LegalSection>

      <LegalSection title="Zusagen">
        <p>
          Wenn ihr zusagt oder absagt, speichern wir den Namen, auf Wunsch die E-Mail-Adresse, ob ihr kommt, die Zahl
          der Personen, deren Namen, die Menüwahl und eine Nachricht. Die Angaben liegen in einer Datenbank auf dem
          Server und sind für uns im Verwaltungsbereich sichtbar. Wir nutzen sie, um die Feier zu planen.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO. Mit dem Absenden willigt ihr ein. Die Einwilligung könnt ihr
          jederzeit widerrufen, etwa per E-Mail. Der Widerruf ändert nichts an der Verarbeitung, die bis dahin erlaubt
          war. Die Zusage ist freiwillig. Die Einladung lässt sich auch ohne sie lesen.
        </p>
        <p>
          Wir löschen Zusagen, wenn ihr uns darum bittet, und sonst, wenn die Hochzeit vorbei ist und wir sie für die
          Organisation nicht mehr brauchen.
        </p>
      </LegalSection>

      <LegalSection title="Fotos">
        <p>
          Beim Hochladen speichern wir den Namen, einen optionalen Bildtext und die Bilddatei auf dem Server. Gäste mit
          Zugangscode sehen das Bild in der Galerie, sobald es freigegeben ist. Die Freigabe kann automatisch oder
          durch uns erfolgen. Andere Gäste sehen dabei den Namen und den Bildtext.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO. Das Hochladen ist freiwillig. Ladet nur Bilder hoch, die ihr
          teilen dürft. Wer auf einem Bild zu sehen ist oder es hochgeladen hat, kann Löschung verlangen. Wir löschen
          das Bild dann, oder wenn wir die Galerie selbst entfernen.
        </p>
      </LegalSection>

      <LegalSection title="Spiel">
        <p>
          Wer mitspielt, gibt einen Anzeigenamen an. Wir speichern den Namen, die Punkte und welche Aufgaben erledigt
          wurden. Andere Gäste mit Zugangscode sehen Namen und Punkte in der Rangliste.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO. Das Spiel ist freiwillig. Wir löschen diese Daten auf Wunsch
          und sonst, wenn wir sie nach der Hochzeit für das Spiel nicht mehr brauchen.
        </p>
      </LegalSection>

      <LegalSection title="E-Mail">
        <p>
          Wenn ihr uns an {operator.email} schreibt, verarbeiten wir eure Adresse und die Nachricht, um zu antworten
          und Anfragen zu euren Daten zu erfüllen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO und, soweit wir
          gesetzlich antworten müssen, Art. 6 Abs. 1 lit. c DSGVO.
        </p>
      </LegalSection>

      <LegalSection title="Links zu anderen Seiten">
        <p>
          Hinweise zu Ort und Anfahrt führen auf Google Maps oder auf die Seite des Festorts. Erst ein Klick öffnet
          diese Seiten. Dann gelten deren Regeln, und der Anbieter erhält die üblichen Verbindungsdaten, darunter die
          IP-Adresse. Wir binden diese Dienste nicht in unsere Seiten ein.
        </p>
      </LegalSection>

      <LegalSection title="Keine Pflicht, keine automatische Entscheidung">
        <p>
          Ihr müsst uns keine Daten über die Einladung hinaus geben. Ohne Zugangscode bleibt die Einladung geschlossen,
          weil das Zugangs-Cookie dafür nötig ist. Zusagen, Fotos und das Spiel sind freiwillig.
        </p>
        <p>Wir treffen keine automatisierten Entscheidungen und erstellen keine Profile über euch.</p>
      </LegalSection>

      <LegalSection title="Eure Rechte">
        <p>Ihr könnt euch an {operator.email} wenden und verlangen:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Auskunft über die Daten, die wir von euch haben (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Herausgabe der Daten, die ihr uns gegeben habt, in einem üblichen Format (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21 DSGVO)</li>
          <li>Widerruf einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li>
        </ul>
        <p>
          Außerdem habt ihr das Recht, euch bei einer Aufsichtsbehörde zu beschweren (Art. 77 DSGVO). Zuständig ist die
          Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen, weil der Verantwortliche in
          Nordrhein-Westfalen wohnt: <LegalLink href="https://www.ldi.nrw.de">ldi.nrw.de</LegalLink>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
