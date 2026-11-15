const tabs = ["rsvp", "photos", "game", "settings", "server"] as const;

export type AdminTab = (typeof tabs)[number];

export function adminTab(value: string | undefined): AdminTab {
  return tabs.find((tab) => tab === value) ?? "rsvp";
}
