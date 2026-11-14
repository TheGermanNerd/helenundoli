/**
 * Texte der Einladung. Antwortfrist und Uhrzeiten sind Platzhalter.
 */
export const wedding = {
  couple: "Helen & Oliver",
  date: "23. Oktober 2027",
  replyBy: "1. August 2026",
  welcome:
    "Der Herbst ist unsere liebste Jahreszeit: warmes Licht, rote Blätter, lange Abende. An so einem Tag wollen wir heiraten und euch um uns haben.",
  place: "Die standesamtliche Trauung ist im Heimathaus in Borghorst. Danach feiern wir bei Thies 42.",
  ceremony: {
    title: "Standesamtliche Trauung",
    venue: "Heimathaus Borghorst",
    lines: ["Münsterstraße 7", "48565 Borghorst"],
    mapsQuery: "Heimathaus Borghorst, Münsterstraße 7, 48565 Steinfurt",
  },
  celebration: {
    title: "Essen und Tanzen danach",
    venue: "Thies 42",
    href: "https://thies42.de/",
    lines: ["Sutrum-Harum 9", "48485 Neuenkirchen"],
    mapsQuery: "Thies 42, Sutrum-Harum 9, 48485 Neuenkirchen",
  },
  scheduleNote: "Die Uhrzeiten sind Platzhalter.",
  faqNote: "Die Antworten sind Platzhalter.",
  faq: [
    {
      question: "Was sollen wir anziehen?",
      answer:
        "Festlich, aber so, dass ihr euch den Abend über wohlfühlt. Warme Herbstfarben passen gut. Weiß lassen wir bitte Helen.",
    },
    {
      question: "Wo können wir parken?",
      answer:
        "Am Heimathaus in Borghorst und bei Thies 42 gibt es Parkplätze in der Nähe. Kommt gern ein wenig früher an.",
    },
    {
      question: "Wie kommen wir von der Trauung zur Feier?",
      answer:
        "Die Trauung ist im Heimathaus in Borghorst, gefeiert wird bei Thies 42 in Neuenkirchen. Dazwischen fahrt ihr mit dem Auto. Die Routen stehen oben bei Datum und Ort.",
    },
    {
      question: "Sind Kinder willkommen?",
      answer:
        "Diesen Abend möchten wir gern mit euch Erwachsenen feiern. Bitte habt Verständnis, dass wir keine Kinder einladen.",
    },
    {
      question: "Habt ihr einen Wunsch zur Hochzeit?",
      answer:
        "Dass ihr da seid, ist uns das schönste Geschenk. Wenn ihr uns etwas schenken möchtet, freuen wir uns über einen Beitrag zu unserer Hochzeitsreise.",
    },
    {
      question: "Wo können wir übernachten?",
      answer:
        "In Steinfurt und rund um Neuenkirchen findet ihr Unterkünfte. Wenn ihr eine Empfehlung braucht, schreibt uns einfach.",
    },
  ],
  schedule: [
    {
      time: "14:00",
      title: "Standesamtliche Trauung",
      text: "Wir geben uns das Ja-Wort im Heimathaus in Borghorst. Kommt gern ein wenig früher, damit ihr in Ruhe ankommt.",
    },
    {
      time: "15:00",
      title: "Sektempfang",
      text: "Anstoßen, ankommen und die ersten Glückwünsche, solange das Licht noch warm ist.",
    },
    {
      time: "18:00",
      title: "Abendessen",
      text: "Ein gemeinsames Essen, ohne Eile. Sagt uns bitte beim Zusagen, was ihr essen möchtet.",
    },
    {
      time: "21:00",
      title: "Feier",
      text: "Musik und Tanz. Bleibt, so lange ihr mögt.",
    },
  ],
} as const;

export function mapsHref(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const MONTHS = [
  "januar",
  "februar",
  "märz",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "dezember",
] as const;

export function invitationDate(value: string) {
  const match = value.match(/^(\d{1,2})\.\s+([A-Za-zÄÖÜäöüß]+)\s+(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const monthName = match[2] ?? "";
  const year = Number(match[3]);
  const monthIndex = MONTHS.indexOf(monthName.toLowerCase() as (typeof MONTHS)[number]);
  if (monthIndex < 0) return null;

  const date = new Date(year, monthIndex, day);
  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) return null;

  const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date);
  const monthShort = monthName.toLowerCase() === "oktober" ? "Okt" : monthName.length > 4 ? monthName.slice(0, 4) : monthName;

  return {
    day: String(day),
    year: String(year),
    weekday,
    monthShort,
  };
}
