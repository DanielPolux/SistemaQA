import {
  BorderStyle, HeadingLevel,
  Paragraph, Table, TableCell, TableRow, TextRun,
  WidthType, VerticalAlign,
} from 'docx';

export function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8D6E8', space: 4 },
    },
    children: [new TextRun({ text, bold: true, size: 22, color: '1E3A5F' })],
  });
}

export function infoTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { bottom: 240 },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: 'EEF2F7' },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, bold: true, size: 20, color: '374151' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 72, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: value, size: 20 })],
              }),
            ],
          }),
        ],
      })
    ),
  });
}

export function multilineParagraphs(text: string): Paragraph[] {
  if (!text?.trim()) {
    return [new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '—', color: '9CA3AF' })] })];
  }
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map((line, i) =>
    new Paragraph({
      spacing: { after: i === lines.length - 1 ? 200 : 80 },
      children: [new TextRun({ text: line.trim(), size: 20 })],
    })
  );
}
