type PrivacyCertificateGuest = {
  nome: string;
  cognome: string;
  dataDiNascita: string;
  luogoDiNascita?: string | null;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 58;
const TOP = 780;
const LINE_HEIGHT = 16;
const BODY_FONT_SIZE = 11;
const TITLE_FONT_SIZE = 16;
const MAX_CHARS_PER_LINE = 88;

function escapeXmlText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function wrapText(text: string, maxChars = MAX_CHARS_PER_LINE): string[] {
  const words = escapeXmlText(text).split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function toPdfLiteral(text: string): string {
  return `(${text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}

function textCommand(text: string, x: number, y: number, size = BODY_FONT_SIZE): string {
  return `BT /F1 ${size} Tf ${x} ${y} Td ${toPdfLiteral(text)} Tj ET`;
}

function lineCommand(x1: number, y1: number, x2: number, y2: number): string {
  return `${x1} ${y1} m ${x2} ${y2} l S`;
}

function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
}

function buildPdf(objects: string[]): Buffer {
  const chunks = ["%PDF-1.4\n%\xFF\xFF\xFF\xFF\n"];
  const offsets: number[] = [];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(chunks.join(""), "binary"));
    chunks.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""), "binary");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (const offset of offsets) {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return Buffer.from(chunks.join(""), "binary");
}

export function createPrivacyCertificatePdf(guest: PrivacyCertificateGuest): Buffer {
  const fullName = `${guest.nome} ${guest.cognome}`.trim();
  const birthPlace = guest.luogoDiNascita?.trim() || "____________________________";
  const birthDate = formatDate(guest.dataDiNascita);
  const paragraphs = [
    `Ai sensi del Regolamento (UE) 2016/679 ("GDPR"), il/la sottoscritto/a ${fullName}, nato/a a ${birthPlace} il ${birthDate} (di seguito "interessato") dichiara di aver ricevuto e preso visione dell'informativa sul trattamento dei dati personali predisposta dalla Comunità di Sant'Egidio ACAP APS.`,
    "L'interessato prende atto che, nell'ambito delle attività di assistenza sanitaria e socio-assistenziale svolte dall'Associazione, potranno essere raccolti e trattati dati personali, anagrafici, economico-patrimoniali e dati relativi alla salute, esclusivamente per la valutazione delle esigenze del beneficiario, la presa in carico e l'erogazione dei servizi richiesti, nonché per l'adempimento degli obblighi di legge connessi.",
    "I dati saranno trattati con modalità idonee a garantirne la riservatezza e la sicurezza, non saranno diffusi e potranno essere comunicati esclusivamente ai soggetti autorizzati o nei casi previsti dalla legge. Il conferimento dei dati è necessario per consentire l'erogazione dei servizi richiesti; l'eventuale rifiuto potrà comportare l'impossibilità di accedere alle prestazioni offerte. L'interessato può esercitare in qualsiasi momento i diritti previsti dagli articoli 15 e seguenti del GDPR, rivolgendosi alla Comunità di Sant'Egidio ACAP APS all'indirizzo e-mail info@santegidio.org.",
    "Con la firma apposta in calce, il/la sottoscritto/a presta il proprio consenso al trattamento dei dati personali e delle categorie particolari di dati eventualmente conferiti per le finalità sopra indicate.",
  ];

  const commands: string[] = [
    "0.12 w",
    textCommand("LIBERATORIA PRIVACY", LEFT, TOP, TITLE_FONT_SIZE),
  ];
  let y = TOP - 36;

  for (const paragraph of paragraphs) {
    for (const line of wrapText(paragraph)) {
      commands.push(textCommand(line, LEFT, y));
      y -= LINE_HEIGHT;
    }
    y -= 12;
  }

  y -= 16;
  commands.push(textCommand("Firma dell'interessato", LEFT, y));
  commands.push(lineCommand(190, y - 2, 535, y - 2));
  y -= 46;
  commands.push(textCommand("Luogo e data", LEFT, y));
  commands.push(lineCommand(190, y - 2, 535, y - 2));

  const content = commands.join("\n");
  const contentObject = `<< /Length ${Buffer.byteLength(content, "binary")} >>\nstream\n${content}\nendstream`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    contentObject,
  ];

  return buildPdf(objects);
}
