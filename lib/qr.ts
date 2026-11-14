import { toString as qrToString } from "qrcode";

export async function qrSvg(text: string) {
  const raw = await qrToString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#6b4630", light: "#fbf6ee" },
  });
  const svg = raw.replace(/^\s*<\?xml[^>]*>\s*/i, "").trim();
  if (!svg.startsWith("<svg") || svg.includes("<script")) {
    throw new Error("Der QR-Code konnte nicht erzeugt werden.");
  }
  return svg;
}
