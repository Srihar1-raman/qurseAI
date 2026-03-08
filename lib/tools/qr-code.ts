import { tool } from 'ai';
import { z } from 'zod';
import qrcodeGenerator from 'qrcode-generator';

interface QRCodeOptions {
  data: string;
  typeNumber?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  cellSize?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

function generateQRCode(options: QRCodeOptions) {
  const {
    data,
    typeNumber = 0,
    errorCorrectionLevel = 'M',
    cellSize = 4,
    margin = 4,
    darkColor = '#000000',
    lightColor = '#ffffff',
  } = options;

  const qr = qrcodeGenerator(typeNumber as any, errorCorrectionLevel as any);
  qr.addData(data);
  qr.make();

  const moduleCount = qr.getModuleCount();

  return {
    data,
    typeNumber: typeNumber,
    errorCorrectionLevel,
    moduleCount,
    options: {
      cellSize,
      margin,
      darkColor,
      lightColor,
    },
  };
}

export const qrCodeTool = tool({
  description: 'Generate QR codes from text or URLs with customizable appearance',
  inputSchema: z.object({
    data: z.string().describe('The text or URL to encode in the QR code'),
    typeNumber: z.number().min(0).max(40).default(0).describe('Type number (1-40) for QR version, 0 for auto detection'),
    errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).default('M').describe('Error correction level: L (~7%), M (~15%), Q (~25%), H (~30%)'),
    cellSize: z.number().min(1).max(20).default(4).describe('Size of each module (cell) in pixels'),
    margin: z.number().min(0).max(20).default(4).describe('Margin around QR code in modules'),
    darkColor: z.string().default('#000000').describe('Dark module color (hex)'),
    lightColor: z.string().default('#ffffff').describe('Light module color (hex)'),
  }),
  execute: async ({ data, typeNumber, errorCorrectionLevel, cellSize, margin, darkColor, lightColor }) => {
    try {
      if (!data || data.trim().length === 0) {
        return { error: 'Data cannot be empty' };
      }

      const result = generateQRCode({
        data: data.trim(),
        typeNumber,
        errorCorrectionLevel,
        cellSize,
        margin,
        darkColor,
        lightColor,
      });

      return result;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to generate QR code',
      };
    }
  },
});
