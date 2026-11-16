export const operator = {
  name: "Kyle Frieler",
  street: "Emsdettener Str. 199",
  postalCode: "48565",
  city: "Steinfurt",
  email: "kyle@germannerd.de",
} as const;

export const ACCESS_COOKIE = "oli_helen_guest";
export const PLAYER_COOKIE = "oli_helen_player";
export const ADMIN_COOKIE = "oli_helen_admin";
export const SAVE_THE_DATE_KEY = "save-the-date-dismissed";
export const COOKIE_NOTICE_KEY = "oli_helen_cookie_notice";

export type StorageNote = {
  name: string;
  where: string;
  purpose: string;
  duration: string;
};

export const storageNotes = [
  {
    name: ACCESS_COOKIE,
    where: "Cookie",
    purpose: "Merkt sich, dass der Zugangscode eingegeben wurde, damit die Einladung geöffnet bleibt.",
    duration: "So lange, wie die Dauer in den Einstellungen gesetzt ist, höchstens 24 Stunden",
  },
  {
    name: PLAYER_COOKIE,
    where: "Cookie",
    purpose: "Wird gesetzt, wenn jemand am Spiel teilnimmt, und verbindet diesen Browser mit dem Spielernamen und den Punkten.",
    duration: "Ein Jahr",
  },
  {
    name: ADMIN_COOKIE,
    where: "Cookie",
    purpose: "Nur nach Anmeldung im nicht öffentlichen Verwaltungsbereich. Gäste erhalten dieses Cookie nicht.",
    duration: "30 Tage",
  },
  {
    name: SAVE_THE_DATE_KEY,
    where: "sessionStorage",
    purpose: "Merkt sich, dass der Hinweis zum Datum in diesem Tab geschlossen wurde.",
    duration: "Bis der Tab geschlossen wird",
  },
  {
    name: COOKIE_NOTICE_KEY,
    where: "localStorage",
    purpose: "Merkt sich, dass dieser Hinweis bestätigt wurde, damit er nicht auf jeder Seite wieder erscheint.",
    duration: "Bis die Website-Daten im Browser gelöscht werden",
  },
] as const satisfies readonly StorageNote[];
