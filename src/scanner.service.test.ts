import { ScannerService, ScanRequest } from './scanner.service.js';
import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';
import AdmZip from 'adm-zip';

// Mock googleapis
jest.mock('googleapis');

// Mock @google/genai
jest.mock('@google/genai');

const mockedGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

describe('ScannerService', () => {
  let scannerService: ScannerService;
  let mockList: jest.Mock;
  let mockGet: jest.Mock;
  let mockAttachmentsGet: jest.Mock;
  let mockInteractionsCreate: jest.Mock;

  const defaultScanRequest: ScanRequest = {
    accessToken: 'mock-access-token',
    clientId: 'mock-client-id',
    clientSecret: 'mock-client-secret',
    supplierEmails: ['supplier@example.com'],
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-26T12:00:00.000Z'));
    jest.clearAllMocks();
    scannerService = new ScannerService();

    // Setup Gmail API mocks
    mockList = jest.fn();
    mockGet = jest.fn();
    mockAttachmentsGet = jest.fn();

    const mockGmailInstance = {
      users: {
        messages: {
          list: mockList,
          get: mockGet,
          attachments: {
            get: mockAttachmentsGet,
          },
        },
      },
    };

    (google.gmail as jest.Mock).mockReturnValue(mockGmailInstance);
    (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
      setCredentials: jest.fn(),
    }));

    // Setup Gemini API mocks
    mockInteractionsCreate = jest.fn();

    mockedGoogleGenAI.mockImplementation(() => ({
      interactions: {
        create: mockInteractionsCreate,
      },
    } as any));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to mock a message with a single attachment
  function setupGmailAttachmentMock(filename: string, mimeType: string, contentBuffer: Buffer) {
    mockList.mockResolvedValue({
      data: {
        messages: [{ id: 'msg-123' }],
      },
    });

    mockGet.mockResolvedValue({
      data: {
        id: 'msg-123',
        payload: {
          headers: [
            { name: 'Subject', value: 'Factura Recibida' },
            { name: 'Date', value: 'Fri, 26 Jun 2026 12:00:00 GMT' },
            { name: 'From', value: 'Supplier <supplier@example.com>' },
          ],
          parts: [
            {
              filename,
              mimeType,
              body: { attachmentId: 'att-555' },
            },
          ],
        },
      },
    });

    mockAttachmentsGet.mockResolvedValue({
      data: {
        data: contentBuffer.toString('base64'),
      },
    });
  }

  describe('XML Parsing', () => {
    test('should parse Chile (DTE) XML structure correctly', async () => {
      const xmlChile = `
        <DTE>
          <Documento>
            <Encabezado>
              <Emisor>
                <RUTEmisor>76123456-7</RUTEmisor>
                <RznSoc>Distribuidora SpA</RznSoc>
              </Emisor>
              <Totales>
                <MntTotal>119000</MntTotal>
              </Totales>
            </Encabezado>
            <Detalle>
              <NmbItem>Filtro de Aceite</NmbItem>
              <QtyItem>5</QtyItem>
              <PrcItem>20000</PrcItem>
            </Detalle>
          </Documento>
        </DTE>
      `;

      setupGmailAttachmentMock('dte.xml', 'text/xml', Buffer.from(xmlChile));

      const result = await scannerService.scanInbox(defaultScanRequest);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('dte.xml');
      expect(result[0].parsedData).toEqual({
        supplierRuc: '76123456-7',
        supplierName: 'Distribuidora SpA',
        total: 119000,
        items: [
          {
            nombre: 'Filtro de Aceite',
            cantidad: 5,
            precioUnitario: 20000,
          },
        ],
      });
    });

    test('should parse Peru/Colombia (UBL) XML structure correctly', async () => {
      const xmlUBL = `
        <Invoice xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
          <cac:AccountingSupplierParty>
            <cac:Party>
              <cac:PartyIdentification>
                <cbc:ID>20123456789</cbc:ID>
              </cac:PartyIdentification>
              <cac:PartyLegalEntity>
                <cbc:RegistrationName>UBL Supplier S.A.C.</cbc:RegistrationName>
              </cac:PartyLegalEntity>
            </cac:Party>
          </cac:AccountingSupplierParty>
          <cac:LegalMonetaryTotal>
            <cbc:PayableAmount>2500.50</cbc:PayableAmount>
          </cac:LegalMonetaryTotal>
          <cac:InvoiceLine>
            <cac:Item>
              <cbc:Description>Servicio de Desarrollo</cbc:Description>
            </cac:Item>
            <cbc:InvoicedQuantity>1</cbc:InvoicedQuantity>
            <cac:Price>
              <cbc:PriceAmount>2500.50</cbc:PriceAmount>
            </cac:Price>
          </cac:InvoiceLine>
        </Invoice>
      `;

      setupGmailAttachmentMock('ubl.xml', 'text/xml', Buffer.from(xmlUBL));

      const result = await scannerService.scanInbox(defaultScanRequest);

      expect(result).toHaveLength(1);
      expect(result[0].parsedData).toEqual({
        supplierRuc: '20123456789',
        supplierName: 'UBL Supplier S.A.C.',
        total: 2500.5,
        items: [
          {
            nombre: 'Servicio de Desarrollo',
            cantidad: 1,
            precioUnitario: 2500.5,
          },
        ],
      });
    });

    test('should parse Mexico (CFDI) XML structure correctly', async () => {
      const xmlCFDI = `
        <cfdi:Comprobante Total="1500.00" xmlns:cfdi="http://www.sat.gob.mx/cfd/4">
          <cfdi:Emisor Rfc="ABC123456T1" Nombre="CFDI Emisor SA de CV"/>
          <cfdi:Conceptos>
            <cfdi:Concepto Descripcion="Consultoria TI" Cantidad="2" ValorUnitario="750.00"/>
          </cfdi:Conceptos>
        </cfdi:Comprobante>
      `;

      setupGmailAttachmentMock('cfdi.xml', 'text/xml', Buffer.from(xmlCFDI));

      const result = await scannerService.scanInbox(defaultScanRequest);

      expect(result).toHaveLength(1);
      expect(result[0].parsedData).toEqual({
        supplierRuc: 'ABC123456T1',
        supplierName: 'CFDI Emisor SA de CV',
        total: 1500,
        items: [
          {
            nombre: 'Consultoria TI',
            cantidad: 2,
            precioUnitario: 750,
          },
        ],
      });
    });

    test('should parse Ecuador (SRI) XML structure correctly', async () => {
      const xmlEcuador = `
        <factura>
          <infoTributaria>
            <ruc>1791234567001</ruc>
            <razonSocial>Ecuadorian Supplier CIA. LTDA.</razonSocial>
          </infoTributaria>
          <infoFactura>
            <importeTotal>450.00</importeTotal>
          </infoFactura>
          <detalles>
            <detalle>
              <descripcion>Mantenimiento de Servidores</descripcion>
              <cantidad>3</cantidad>
              <preciounitario>150.00</preciounitario>
            </detalle>
          </detalles>
        </factura>
      `;

      setupGmailAttachmentMock('ecuador.xml', 'text/xml', Buffer.from(xmlEcuador));

      const result = await scannerService.scanInbox(defaultScanRequest);

      expect(result).toHaveLength(1);
      expect(result[0].parsedData).toEqual({
        supplierRuc: '1791234567001',
        supplierName: 'Ecuadorian Supplier CIA. LTDA.',
        total: 450,
        items: [
          {
            nombre: 'Mantenimiento de Servidores',
            cantidad: 3,
            precioUnitario: 150,
          },
        ],
      });
    });

    test('should parse Ecuador (SRI) XML wrapped in CDATA envelope correctly', async () => {
      const xmlEcuadorCDATA = `
        <autorizacion>
          <estado>AUTORIZADO</estado>
          <numeroAutorizacion>1234567890123456789012345678901234567890123456789</numeroAutorizacion>
          <fechaAutorizacion>2026-06-26T10:00:00-05:00</fechaAutorizacion>
          <comprobante><![CDATA[<?xml version="1.0" encoding="utf-8"?>
            <factura id="comprobante" version="1.1.0">
              <infoTributaria>
                <ruc>1791234567001</ruc>
                <razonSocial>Ecuadorian Supplier CIA. LTDA.</razonSocial>
              </infoTributaria>
              <infoFactura>
                <importeTotal>450.00</importeTotal>
              </infoFactura>
              <detalles>
                <detalle>
                  <descripcion>Mantenimiento de Servidores</descripcion>
                  <cantidad>3</cantidad>
                  <preciounitario>150.00</preciounitario>
                </detalle>
              </detalles>
            </factura>
          ]]></comprobante>
        </autorizacion>
      `;

      setupGmailAttachmentMock('ecuador_envelope.xml', 'text/xml', Buffer.from(xmlEcuadorCDATA));

      const result = await scannerService.scanInbox(defaultScanRequest);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('ecuador_envelope.xml');
      expect(result[0].parsedData).toEqual({
        supplierRuc: '1791234567001',
        supplierName: 'Ecuadorian Supplier CIA. LTDA.',
        total: 450,
        items: [
          {
            nombre: 'Mantenimiento de Servidores',
            cantidad: 3,
            precioUnitario: 150,
          },
        ],
      });
    });

    test('should parse Generic XML fallback structure correctly', async () => {
      const xmlGeneric = `
        <InvoiceDoc>
          <ruc>12345</ruc>
          <name>Generic Company</name>
          <total>999</total>
        </InvoiceDoc>
      `;

      setupGmailAttachmentMock('generic.xml', 'text/xml', Buffer.from(xmlGeneric));

      const result = await scannerService.scanInbox(defaultScanRequest);

      expect(result).toHaveLength(1);
      expect(result[0].parsedData).toEqual({
        supplierRuc: '12345',
        supplierName: 'Generic Company',
        total: 999,
        items: [],
      });
    });
  });

  describe('ZIP Decompression', () => {
    test('should extract and parse XML and PDF from ZIP attachment', async () => {
      const xmlChile = `
        <DTE>
          <Documento>
            <Encabezado>
              <Emisor>
                <RUTEmisor>76123456-7</RUTEmisor>
                <RznSoc>Distribuidora SpA</RznSoc>
              </Emisor>
              <Totales>
                <MntTotal>1000</MntTotal>
              </Totales>
            </Encabezado>
          </Documento>
        </DTE>
      `;

      const zip = new AdmZip();
      zip.addFile('nested-dte.xml', Buffer.from(xmlChile, 'utf-8'));
      zip.addFile('nested-invoice.pdf', Buffer.from('%PDF-1.4 dummy pdf content', 'utf-8'));
      const zipBuffer = zip.toBuffer();

      setupGmailAttachmentMock('invoices.zip', 'application/zip', zipBuffer);

      // We provide geminiApiKey to parse the nested PDF
      mockInteractionsCreate.mockResolvedValue({
        status: 'completed',
        output_text: JSON.stringify({
          supplierRuc: '76123456-7',
          supplierName: 'Gemini Zipped Vendor',
          total: 20000,
          items: [
            { nombre: 'Zipped PDF Item', cantidad: 1, precioUnitario: 20000 }
          ]
        }),
      });

      const requestWithGemini = {
        ...defaultScanRequest,
        geminiApiKey: 'mock-gemini-key',
      };

      const result = await scannerService.scanInbox(requestWithGemini);

      // Should find 2 attachments inside the zip: 1 xml and 1 pdf
      expect(result).toHaveLength(2);

      const xmlResult = result.find(r => r.filename === 'nested-dte.xml');
      const pdfResult = result.find(r => r.filename === 'nested-invoice.pdf');

      expect(xmlResult).toBeDefined();
      expect(xmlResult?.parsedData?.total).toBe(1000);

      expect(pdfResult).toBeDefined();
      expect(pdfResult?.parsedData?.total).toBe(20000);
      expect(pdfResult?.parsedData?.supplierName).toBe('Gemini Zipped Vendor');
    });
  });

  describe('Gemini PDF Parsing', () => {
    test('should call Gemini API to parse PDF when geminiApiKey is provided', async () => {
      setupGmailAttachmentMock('invoice.pdf', 'application/pdf', Buffer.from('%PDF-1.4 dummy pdf', 'utf-8'));

      mockInteractionsCreate.mockResolvedValue({
        status: 'completed',
        output_text: JSON.stringify({
          supplierRuc: '77665544-3',
          supplierName: 'PDF Vendor LLC',
          total: 10500.5,
          items: [
            { nombre: 'Consulting', cantidad: 1, precioUnitario: 10500.5 }
          ]
        }),
      });

      const requestWithGemini = {
        ...defaultScanRequest,
        geminiApiKey: 'valid-gemini-key',
      };

      const result = await scannerService.scanInbox(requestWithGemini);

      expect(result).toHaveLength(1);
      expect(result[0].parsedData).toEqual({
        supplierRuc: '77665544-3',
        supplierName: 'PDF Vendor LLC',
        total: 10500.5,
        items: [
          { nombre: 'Consulting', cantidad: 1, precioUnitario: 10500.5 }
        ]
      });

      expect(mockedGoogleGenAI).toHaveBeenCalledWith({
        apiKey: 'valid-gemini-key',
        apiVersion: 'v1',
      });
      expect(mockInteractionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3.5-flash',
        })
      );
      expect(mockInteractionsCreate).toHaveBeenCalledTimes(1);
    });

    test('should NOT parse PDF (parsedData undefined) when geminiApiKey is NOT provided', async () => {
      setupGmailAttachmentMock('invoice.pdf', 'application/pdf', Buffer.from('%PDF-1.4 dummy pdf', 'utf-8'));

      const result = await scannerService.scanInbox(defaultScanRequest);

      expect(result).toHaveLength(1);
      expect(result[0].parsedData).toBeUndefined();
      expect(mockInteractionsCreate).not.toHaveBeenCalled();
    });
  });

  describe('Gmail Query construction', () => {
    test('should construct has:attachment query with sinceDate and correct supplier emails', async () => {
      mockList.mockResolvedValue({ data: { messages: [] } });

      const request: ScanRequest = {
        ...defaultScanRequest,
        supplierEmails: ['a@test.com', 'b@test.com'],
        sinceDate: '2026-06-01T00:00:00.000Z',
      };

      await scannerService.scanInbox(request);

      expect(mockList).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'me',
        q: '(from:a@test.com OR from:b@test.com) has:attachment after:2026/06/01',
      }));
    });

    test('should default query to 30 days ago when sinceDate is omitted', async () => {
      mockList.mockResolvedValue({ data: { messages: [] } });

      const request: ScanRequest = {
        ...defaultScanRequest,
        supplierEmails: ['a@test.com'],
      };

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
      const yyyy = thirtyDaysAgo.getUTCFullYear();
      const mm = String(thirtyDaysAgo.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(thirtyDaysAgo.getUTCDate()).padStart(2, '0');
      const expectedAfter = `after:${yyyy}/${mm}/${dd}`;

      await scannerService.scanInbox(request);

      expect(mockList).toHaveBeenCalledWith(expect.objectContaining({
        q: expect.stringContaining(expectedAfter),
      }));
    });

    test('should return empty list if supplierEmails is empty', async () => {
      const request: ScanRequest = {
        ...defaultScanRequest,
        supplierEmails: [],
      };

      const result = await scannerService.scanInbox(request);
      expect(result).toEqual([]);
      expect(mockList).not.toHaveBeenCalled();
    });
  });
});
