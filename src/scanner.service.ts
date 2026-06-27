import { google } from 'googleapis';
import AdmZip from 'adm-zip';
import * as xml2js from 'xml2js';
import { GoogleGenAI } from '@google/genai';

export interface ScanRequest {
  accessToken: string;
  refreshToken?: string;
  clientId: string;
  clientSecret: string;
  supplierEmails: string[];
  sinceDate?: string; // ISO date string
  geminiApiKey?: string;
}

export interface ParsedItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total?: number;
}

export interface ParsedInvoiceData {
  messageId?: string;
  attachmentId?: string;
  claveAcceso?: string;
  supplierRuc?: string;
  supplierName?: string;
  numeroFactura?: string;
  fechaEmision?: string;
  subtotal?: number;
  iva?: number;
  total?: number;
  moneda?: string;
  items?: ParsedItem[];
}

export interface ScanResponseItem {
  gmailMessageId: string;
  gmailAttachmentId: string;
  filename: string;
  mimeType: string;
  fileBase64: string;
  emailSubject: string;
  emailDate: string;
  senderEmail: string;
  parsedData?: ParsedInvoiceData;
}

export class ScannerService {
  /**
   * Helper to safely extract string text from xml2js nodes (handling both raw strings and nodes with attributes)
   */
  private getText(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
      if (val._ !== undefined && val._ !== null) return String(val._).trim();
      if (Array.isArray(val)) return this.getText(val[0]);
      if (Object.keys(val).length === 0) return '';
    }
    return '';
  }

  /**
   * Helper to recursively find a tag or property name in an object (checking both properties and attributes '$')
   */
  private findDeepValue(obj: any, targetKey: string): any {
    if (!obj || typeof obj !== 'object') return null;

    const lowerTarget = targetKey.toLowerCase();

    // 1. Check direct keys of the object
    for (const key in obj) {
      const cleanKey = key.split(':').pop();
      if (cleanKey && cleanKey.toLowerCase() === lowerTarget) {
        const val = obj[key];
        return Array.isArray(val) ? val[0] : val;
      }
    }

    // 2. Check attributes under '$'
    if (obj.$) {
      for (const key in obj.$) {
        const cleanKey = key.split(':').pop();
        if (cleanKey && cleanKey.toLowerCase() === lowerTarget) {
          return obj.$[key];
        }
      }
    }

    // 3. Recurse down children
    for (const key in obj) {
      if (key === '$') continue;
      const val = obj[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          const res = this.findDeepValue(item, targetKey);
          if (res !== null && res !== undefined) return res;
        }
      } else if (typeof val === 'object') {
        const res = this.findDeepValue(val, targetKey);
        if (res !== null && res !== undefined) return res;
      }
    }

    return null;
  }

  /**
   * Extract details array
   */
  private extractItems(obj: any, format: string): ParsedItem[] | undefined {
    const items: ParsedItem[] = [];
    
    if (format === 'CFDI') {
      const conceptosParent = this.findDeepValue(obj, 'conceptos');
      if (conceptosParent) {
        const conceptoList = conceptosParent['cfdi:Concepto'] || conceptosParent['Concepto'] || [];
        for (const item of conceptoList) {
          const attrs = item.$ || {};
          const nombre = attrs.Descripcion || attrs.descripcion || '';
          const cantidad = parseFloat(attrs.Cantidad || attrs.cantidad || '1');
          const precioUnitario = parseFloat(attrs.ValorUnitario || attrs.valorunitario || '0');
          const total = parseFloat(attrs.Importe || attrs.importe || String(cantidad * precioUnitario));
          if (nombre) {
            items.push({ nombre, cantidad, precioUnitario, total });
          }
        }
      }
    } else if (format === 'DTE') {
      const documentNode = obj.Documento?.[0] || obj;
      const detalleRaw = documentNode.Detalle || [];
      const detalles = Array.isArray(detalleRaw) ? detalleRaw : [detalleRaw];
      for (const det of detalles) {
        const nombre = this.getText(this.findDeepValue(det, 'nmbitem') || this.findDeepValue(det, 'dscitem'));
        const cantidad = parseFloat(this.getText(this.findDeepValue(det, 'qtyitem')) || '1');
        const precioUnitario = parseFloat(this.getText(this.findDeepValue(det, 'prcitem')) || '0');
        const total = parseFloat(this.getText(this.findDeepValue(det, 'montoitem')) || String(cantidad * precioUnitario));
        if (nombre) {
          items.push({ nombre, cantidad, precioUnitario, total });
        }
      }
    } else if (format === 'UBL') {
      const invoiceLinesRaw = obj['cac:InvoiceLine'] || obj.InvoiceLine || [];
      const lines = Array.isArray(invoiceLinesRaw) ? invoiceLinesRaw : [invoiceLinesRaw];
      for (const line of lines) {
        const itemNode = this.findDeepValue(line, 'item');
        const nombre = this.getText(this.findDeepValue(itemNode, 'description') || this.findDeepValue(itemNode, 'name'));
        const cantidad = parseFloat(this.getText(this.findDeepValue(line, 'invoicedquantity') || this.findDeepValue(line, 'quantity')) || '1');
        
        const priceNode = this.findDeepValue(line, 'price');
        const precioUnitario = parseFloat(this.getText(this.findDeepValue(priceNode, 'priceamount') || this.findDeepValue(line, 'priceamount')) || '0');
        const total = parseFloat(this.getText(this.findDeepValue(line, 'lineextensionamount')) || String(cantidad * precioUnitario));
        
        if (nombre) {
          items.push({ nombre, cantidad, precioUnitario, total });
        }
      }
    } else if (format === 'ECUADOR') {
      const detallesNode = obj.detalles?.[0] || this.findDeepValue(obj, 'detalles');
      const detalleRaw = detallesNode?.detalle || [];
      const detalles = Array.isArray(detalleRaw) ? detalleRaw : [detalleRaw];
      for (const det of detalles) {
        const nombre = this.getText(this.findDeepValue(det, 'descripcion'));
        const cantidad = parseFloat(this.getText(this.findDeepValue(det, 'cantidad')) || '1');
        const precioUnitario = parseFloat(this.getText(this.findDeepValue(det, 'preciounitario')) || '0');
        const total = parseFloat(this.getText(this.findDeepValue(det, 'preciototalsinimpuesto')) || String(cantidad * precioUnitario));
        if (nombre) {
          items.push({ nombre, cantidad, precioUnitario, total });
        }
      }
    }

    return items.length > 0 ? items : undefined;
  }

  /**
   * Parses XML invoice data using specific formats (DTE, UBL, CFDI) or generic fallback.
   */
  private async parseXMLInvoice(xmlContent: string): Promise<ParsedInvoiceData | undefined> {
    try {
      const parser = new xml2js.Parser({ explicitArray: true, ignoreAttrs: false });
      let result = await parser.parseStringPromise(xmlContent);

      // Check if there is an authorization envelope wrapping the invoice in CDATA (Ecuador SRI style)
      const comprobanteRaw = this.findDeepValue(result, 'comprobante');
      if (comprobanteRaw) {
        const comprobanteStr = this.getText(comprobanteRaw);
        if (comprobanteStr && (comprobanteStr.includes('<factura') || comprobanteStr.includes('<?xml'))) {
          try {
            const innerResult = await parser.parseStringPromise(comprobanteStr);
            if (innerResult) {
              result = innerResult;
            }
          } catch (innerError) {
            console.error('Failed to parse inner CDATA XML from comprobante:', innerError);
          }
        }
      }

      // Determine format
      let format = 'GENERIC';
      let rootKey = '';
      for (const key in result) {
        const cleanKey = key.split(':').pop();
        if (cleanKey === 'Invoice') {
          format = 'UBL';
          rootKey = key;
          break;
        } else if (cleanKey === 'DTE') {
          format = 'DTE';
          rootKey = key;
          break;
        } else if (cleanKey === 'Comprobante') {
          format = 'CFDI';
          rootKey = key;
          break;
        } else if (cleanKey?.toLowerCase() === 'factura') {
          format = 'ECUADOR';
          rootKey = key;
          break;
        }
      }

      let ruc = '';
      let name = '';
      let total = 0;
      let items: ParsedItem[] | undefined = [];

      let claveAcceso: string | undefined = undefined;
      let numeroFactura: string | undefined = undefined;
      let fechaEmision: string | undefined = undefined;
      let subtotal: number | undefined = undefined;
      let iva: number | undefined = undefined;
      let moneda: string | undefined = undefined;

      const rootNode = result[rootKey] || result;

      if (format === 'DTE') {
        const emisor = rootNode.Documento?.[0]?.Encabezado?.[0]?.Emisor?.[0] || this.findDeepValue(rootNode, 'emisor');
        ruc = this.getText(this.findDeepValue(emisor, 'rutemisor'));
        name = this.getText(this.findDeepValue(emisor, 'rznsoc') || this.findDeepValue(emisor, 'rznsocemisor'));
        
        const totales = rootNode.Documento?.[0]?.Encabezado?.[0]?.Totales?.[0] || this.findDeepValue(rootNode, 'totales');
        total = parseFloat(this.getText(this.findDeepValue(totales, 'mnttotal')) || '0');
        subtotal = parseFloat(this.getText(this.findDeepValue(totales, 'mntneto'))) || undefined;
        iva = parseFloat(this.getText(this.findDeepValue(totales, 'iva'))) || undefined;

        const idDoc = rootNode.Documento?.[0]?.Encabezado?.[0]?.IdDoc?.[0] || this.findDeepValue(rootNode, 'iddoc');
        const folio = this.getText(this.findDeepValue(idDoc, 'folio'));
        const tipoDTE = this.getText(this.findDeepValue(idDoc, 'tipodte'));
        claveAcceso = folio && ruc ? `DTE-${ruc}-${tipoDTE || '33'}-${folio}` : undefined;
        numeroFactura = folio || undefined;
        fechaEmision = this.getText(this.findDeepValue(idDoc, 'fchemis')) || undefined;
        moneda = this.getText(this.findDeepValue(idDoc, 'tpomoneda')) || 'CLP';
        
        items = this.extractItems(rootNode, 'DTE');
      } else if (format === 'UBL') {
        const supplierParty = rootNode['cac:AccountingSupplierParty']?.[0] || this.findDeepValue(rootNode, 'accountingsupplierparty');
        const supplierPartyNode = supplierParty?.['cac:Party']?.[0] || this.findDeepValue(supplierParty, 'party');
        
        const partyIdNode = supplierPartyNode?.['cac:PartyIdentification']?.[0] || this.findDeepValue(supplierPartyNode, 'partyidentification');
        ruc = this.getText(this.findDeepValue(partyIdNode, 'id'));
        
        const legalEntityNode = supplierPartyNode?.['cac:PartyLegalEntity']?.[0] || this.findDeepValue(supplierPartyNode, 'partylegalentity');
        name = this.getText(this.findDeepValue(legalEntityNode, 'registrationname') || this.findDeepValue(supplierPartyNode, 'registrationname') || this.findDeepValue(supplierPartyNode, 'name'));
        
        const legalTotal = rootNode['cac:LegalMonetaryTotal']?.[0] || this.findDeepValue(rootNode, 'legalmonetarytotal');
        total = parseFloat(this.getText(this.findDeepValue(legalTotal, 'payableamount')) || '0');
        subtotal = parseFloat(this.getText(this.findDeepValue(legalTotal, 'taxexclusiveamount') || this.findDeepValue(legalTotal, 'lineextensionamount'))) || undefined;

        const taxTotalNode = rootNode['cac:TaxTotal']?.[0] || this.findDeepValue(rootNode, 'taxtotal');
        iva = parseFloat(this.getText(this.findDeepValue(taxTotalNode, 'taxamount'))) || undefined;

        claveAcceso = this.getText(rootNode['cbc:UUID']?.[0] || rootNode.UUID?.[0] || rootNode.uuid?.[0]) || undefined;
        numeroFactura = this.getText(rootNode['cbc:ID']?.[0] || rootNode.ID?.[0] || rootNode.id?.[0]) || undefined;
        fechaEmision = this.getText(rootNode['cbc:IssueDate']?.[0] || rootNode.IssueDate?.[0] || rootNode.issuedate?.[0]) || undefined;
        moneda = this.getText(rootNode['cbc:DocumentCurrencyCode']?.[0] || rootNode.DocumentCurrencyCode?.[0] || rootNode.documentcurrencycode?.[0]) || undefined;
        
        items = this.extractItems(rootNode, 'UBL');
      } else if (format === 'CFDI') {
        const emisor = rootNode['cfdi:Emisor']?.[0] || this.findDeepValue(rootNode, 'emisor');
        if (emisor && emisor.$) {
          ruc = emisor.$.Rfc || emisor.$.rfc || '';
          name = emisor.$.Nombre || emisor.$.nombre || '';
        }
        
        if (rootNode.$) {
          total = parseFloat(rootNode.$.Total || rootNode.$.total || '0');
          subtotal = parseFloat(rootNode.$.SubTotal || rootNode.$.subtotal || '0') || undefined;
          moneda = rootNode.$.Moneda || rootNode.$.moneda || undefined;
          
          const folio = rootNode.$.Folio || rootNode.$.folio || '';
          const serie = rootNode.$.Serie || rootNode.$.serie || '';
          numeroFactura = folio ? (serie ? `${serie}-${folio}` : folio) : undefined;
          fechaEmision = (rootNode.$.Fecha || rootNode.$.fecha || '').split('T')[0] || undefined;
        }

        const tfdNode = this.findDeepValue(rootNode, 'timbrefiscaldigital');
        claveAcceso = (tfdNode?.$?.UUID || tfdNode?.$?.uuid || this.findDeepValue(tfdNode, 'uuid')) || undefined;

        const impuestos = rootNode['cfdi:Impuestos']?.[0] || this.findDeepValue(rootNode, 'impuestos');
        const traslados = impuestos?.['cfdi:Traslados']?.[0]?.['cfdi:Traslado'] || this.findDeepValue(impuestos, 'traslado') || [];
        const trasladosArr = Array.isArray(traslados) ? traslados : [traslados];
        let computedIva = 0;
        for (const tr of trasladosArr) {
          const trAttrs = tr.$ || {};
          const imp = trAttrs.Impuesto || trAttrs.impuesto || '';
          if (imp === '002' || imp.toLowerCase() === 'iva') {
            computedIva += parseFloat(trAttrs.Importe || trAttrs.importe || '0');
          }
        }
        iva = computedIva > 0 ? computedIva : undefined;
        
        items = this.extractItems(rootNode, 'CFDI');
      } else if (format === 'ECUADOR') {
        const infoTributaria = rootNode.infoTributaria?.[0] || this.findDeepValue(rootNode, 'infotributaria');
        ruc = this.getText(this.findDeepValue(infoTributaria, 'ruc'));
        name = this.getText(this.findDeepValue(infoTributaria, 'razonSocial') || this.findDeepValue(infoTributaria, 'nombreComercial'));
        claveAcceso = this.getText(this.findDeepValue(infoTributaria, 'claveacceso')) || undefined;
        
        const estab = this.getText(this.findDeepValue(infoTributaria, 'estab'));
        const ptoEmi = this.getText(this.findDeepValue(infoTributaria, 'ptoemi'));
        const secuencial = this.getText(this.findDeepValue(infoTributaria, 'secuencial'));
        numeroFactura = estab && ptoEmi && secuencial ? `${estab}-${ptoEmi}-${secuencial}` : secuencial || undefined;

        const infoFactura = rootNode.infoFactura?.[0] || this.findDeepValue(rootNode, 'infofactura');
        total = parseFloat(this.getText(this.findDeepValue(infoFactura, 'importeTotal')) || '0');
        subtotal = parseFloat(this.getText(this.findDeepValue(infoFactura, 'totalsinimpuestos'))) || undefined;
        moneda = this.getText(this.findDeepValue(infoFactura, 'moneda')) || 'USD';

        const rawFecha = this.getText(this.findDeepValue(infoFactura, 'fechaemision'));
        if (rawFecha && rawFecha.includes('/')) {
          const parts = rawFecha.split('/');
          if (parts.length === 3) {
            fechaEmision = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        } else {
          fechaEmision = rawFecha || undefined;
        }

        const totalConImpuestos = infoFactura?.totalConImpuestos?.[0] || this.findDeepValue(infoFactura, 'totalconimpuestos');
        const totalImpuesto = totalConImpuestos?.totalImpuesto || this.findDeepValue(totalConImpuestos, 'totalimpuesto') || [];
        const totalImpuestosArr = Array.isArray(totalImpuesto) ? totalImpuesto : [totalImpuesto];
        let ecuIva = 0;
        for (const imp of totalImpuestosArr) {
          const cod = this.getText(this.findDeepValue(imp, 'codigo'));
          if (cod === '2') {
            ecuIva += parseFloat(this.getText(this.findDeepValue(imp, 'valor')) || '0');
          }
        }
        iva = ecuIva > 0 ? ecuIva : undefined;

        items = this.extractItems(rootNode, 'ECUADOR');
      } else {
        ruc = this.getText(this.findDeepValue(rootNode, 'rutemisor') || this.findDeepValue(rootNode, 'ruc') || this.findDeepValue(rootNode, 'rfc'));
        name = this.getText(this.findDeepValue(rootNode, 'rznsocemisor') || this.findDeepValue(rootNode, 'rznsoc') || this.findDeepValue(rootNode, 'razonsocial') || this.findDeepValue(rootNode, 'name'));
        total = parseFloat(this.getText(this.findDeepValue(rootNode, 'mnttotal') || this.findDeepValue(rootNode, 'importetotal') || this.findDeepValue(rootNode, 'total')) || '0');
        
        claveAcceso = this.getText(this.findDeepValue(rootNode, 'claveacceso') || this.findDeepValue(rootNode, 'uuid')) || undefined;
        numeroFactura = this.getText(rootNode.Folio || this.findDeepValue(rootNode, 'folio') || this.findDeepValue(rootNode, 'secuencial') || this.findDeepValue(rootNode, 'numerofactura') || this.findDeepValue(rootNode, 'id')) || undefined;
        fechaEmision = this.getText(rootNode.Fecha || this.findDeepValue(rootNode, 'fechaemision') || this.findDeepValue(rootNode, 'fecha') || this.findDeepValue(rootNode, 'issuedate')) || undefined;
        subtotal = parseFloat(this.getText(this.findDeepValue(rootNode, 'subtotal') || this.findDeepValue(rootNode, 'totalsinimpuestos'))) || undefined;
        iva = parseFloat(this.getText(this.findDeepValue(rootNode, 'iva') || this.findDeepValue(rootNode, 'impuesto') || this.findDeepValue(rootNode, 'taxamount'))) || undefined;
        moneda = this.getText(this.findDeepValue(rootNode, 'moneda') || this.findDeepValue(rootNode, 'documentcurrencycode')) || undefined;
      }

      const response: ParsedInvoiceData = {
        claveAcceso: claveAcceso || undefined,
        supplierRuc: ruc || undefined,
        supplierName: name || undefined,
        numeroFactura: numeroFactura || undefined,
        fechaEmision: fechaEmision || undefined,
        subtotal: subtotal || undefined,
        iva: iva || undefined,
        total: total || undefined,
        moneda: moneda || undefined,
        items: items || undefined,
      };

      return this.cleanParsedData(response);
    } catch (error) {
      console.error('Failed to parse XML invoice:', error);
      return undefined;
    }
  }

  /**
   * Parses PDF invoice data using Google Gemini 1.5 Flash structured JSON generation.
   */
  private async parsePDFInvoice(pdfBuffer: Buffer, apiKey: string): Promise<ParsedInvoiceData | undefined> {
    try {
      const client = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
      const interaction = await client.interactions.create({
        model: "gemini-3.5-flash",
        input: [
          {
            type: "user_input",
            content: [
              {
                type: "document",
                data: pdfBuffer.toString("base64"),
                mime_type: "application/pdf"
              },
              {
                type: "text",
                text: "Extract the invoice details. Parse the document carefully and return a JSON matching the requested schema."
              }
            ]
          }
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: {
            type: "object",
            properties: {
              claveAcceso: { type: "string", description: "Access key, UUID, electronic signature key, or transaction hash of the invoice. Null if not present." },
              supplierRuc: { type: "string", description: "Tax identification number (RUT, RUC, RFC, or NIT) of the vendor/issuer" },
              supplierName: { type: "string", description: "Official business name of the vendor" },
              numeroFactura: { type: "string", description: "The invoice number (often in format like 001-002-000123456 or a sequential folio number)" },
              fechaEmision: { type: "string", description: "Issue date of the invoice in YYYY-MM-DD format" },
              subtotal: { type: "number", description: "Subtotal amount before taxes" },
              iva: { type: "number", description: "Total value-added tax (IVA/IGV) amount" },
              total: { type: "number", description: "Total payable amount of the invoice" },
              moneda: { type: "string", description: "Currency code (e.g. USD, CLP, COP, MXN, PEN)" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nombre: { type: "string", description: "Name or description of the product or service" },
                    cantidad: { type: "number", description: "Quantity of items" },
                    precioUnitario: { type: "number", description: "Unit price of the item" },
                    total: { type: "number", description: "Total amount for this line item (quantity * precioUnitario)" }
                  },
                  required: ["nombre", "cantidad", "precioUnitario", "total"]
                }
              }
            },
            required: ["supplierRuc", "supplierName", "total"]
          }
        }
      });

      if (interaction.status !== 'completed') {
        console.error('Gemini interaction did not complete successfully. Status:', interaction.status, 'Error:', (interaction as any).error);
      }

      const text = interaction.output_text;
      if (!text) return undefined;

      const parsed: ParsedInvoiceData = JSON.parse(text);
      return this.cleanParsedData(parsed);
    } catch (error) {
      console.error('Failed to parse PDF invoice using Gemini:', error);
      return undefined;
    }
  }

  /**
   * Scans a Gmail inbox for messages from matching supplier emails and downloads invoice attachments.
   */
  public async scan(req: ScanRequest): Promise<ParsedInvoiceData[]> {
    if (!req.supplierEmails || req.supplierEmails.length === 0) {
      return [];
    }

    // Setup OAuth2 client
    const oauth2Client = new google.auth.OAuth2(req.clientId, req.clientSecret);
    oauth2Client.setCredentials({
      access_token: req.accessToken,
      refresh_token: req.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const results: ParsedInvoiceData[] = [];

    // Formulate search date (default to 30 days ago if not provided)
    let afterQuery = '';
    if (req.sinceDate) {
      const date = new Date(req.sinceDate);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(date.getUTCDate()).padStart(2, '0');
      afterQuery = ` after:${yyyy}/${mm}/${dd}`;
    } else {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - 30); // 30 days ago
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(date.getUTCDate()).padStart(2, '0');
      afterQuery = ` after:${yyyy}/${mm}/${dd}`;
    }

    // Build the query: from:(email1 OR email2 OR ...) has:attachment (pdf OR xml OR zip)
    const fromList = req.supplierEmails.map((email) => `from:${email}`).join(' OR ');
    const query = `(${fromList}) has:attachment${afterQuery}`;
    
    console.log(`Searching Gmail with query: "${query}"`);

    // Fetch messages list
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      console.log('No messages found matching search criteria.');
      return [];
    }

    // For each message, fetch details and download attachments
    for (const msgRef of response.data.messages) {
      if (!msgRef.id) continue;

      try {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: msgRef.id,
        });

        // Collect all potential attachments of interest from payload
        const attachments: { filename: string; attachmentId: string; mimeType: string }[] = [];
        const collectAttachments = (parts: any[]) => {
          for (const part of parts) {
            const filename = part.filename;
            const attachmentId = part.body?.attachmentId;
            if (part.parts && part.parts.length > 0) {
              collectAttachments(part.parts);
            }
            if (filename && attachmentId) {
              const ext = filename.split('.').pop()?.toLowerCase();
              const allowedExtensions = ['pdf', 'xml', 'zip'];
              if (ext && allowedExtensions.includes(ext)) {
                attachments.push({ filename, attachmentId, mimeType: part.mimeType || '' });
              }
            }
          }
        };

        if (msg.data.payload?.parts) {
          collectAttachments(msg.data.payload.parts);
        } else if (msg.data.payload?.body?.attachmentId) {
          collectAttachments([msg.data.payload]);
        }

        if (attachments.length === 0) continue;

        const messageInvoices: ParsedInvoiceData[] = [];
        let hasSuccessfulXml = false;

        const xmlAttachments = attachments.filter(a => a.filename.split('.').pop()?.toLowerCase() === 'xml');
        const zipAttachments = attachments.filter(a => a.filename.split('.').pop()?.toLowerCase() === 'zip');
        const pdfAttachments = attachments.filter(a => a.filename.split('.').pop()?.toLowerCase() === 'pdf');

        // 1. Process direct XML files first
        for (const att of xmlAttachments) {
          try {
            const attachment = await gmail.users.messages.attachments.get({
              userId: 'me',
              messageId: msgRef.id!,
              id: att.attachmentId,
            });
            const dataBase64Url = attachment.data.data;
            if (dataBase64Url) {
              const buffer = Buffer.from(dataBase64Url, 'base64');
              const xmlContent = buffer.toString('utf-8');
              const parsedData = await this.parseXMLInvoice(xmlContent);
              if (parsedData && (parsedData.supplierRuc || parsedData.supplierName || parsedData.total)) {
                parsedData.messageId = msgRef.id;
                parsedData.attachmentId = att.attachmentId;
                if (!parsedData.claveAcceso) {
                  parsedData.claveAcceso = msgRef.id;
                }
                messageInvoices.push(parsedData);
                hasSuccessfulXml = true;
              }
            }
          } catch (err) {
            console.error(`Failed to process direct XML attachment ${att.filename}:`, err);
          }
        }

        // 2. Process ZIP files (extracting content, parsing XMLs inside them first)
        const extractedZips: {
          zipFilename: string;
          attachmentId: string;
          xmls: { entryName: string; buffer: Buffer }[];
          pdfs: { entryName: string; buffer: Buffer }[];
        }[] = [];

        for (const att of zipAttachments) {
          try {
            const attachment = await gmail.users.messages.attachments.get({
              userId: 'me',
              messageId: msgRef.id!,
              id: att.attachmentId,
            });
            const dataBase64Url = attachment.data.data;
            if (dataBase64Url) {
              const buffer = Buffer.from(dataBase64Url, 'base64');
              const zip = new AdmZip(buffer);
              const zipEntries = zip.getEntries();
              
              const xmls: { entryName: string; buffer: Buffer }[] = [];
              const pdfs: { entryName: string; buffer: Buffer }[] = [];

              for (const entry of zipEntries) {
                if (entry.isDirectory) continue;
                const zipFilename = entry.entryName.split('/').pop() || entry.entryName;
                const zipExt = zipFilename.split('.').pop()?.toLowerCase();
                if (zipExt === 'xml') {
                  xmls.push({ entryName: entry.entryName, buffer: entry.getData() });
                } else if (zipExt === 'pdf') {
                  pdfs.push({ entryName: entry.entryName, buffer: entry.getData() });
                }
              }

              extractedZips.push({ zipFilename: att.filename, attachmentId: att.attachmentId, xmls, pdfs });

              // Parse XML files found in the ZIP
              for (const xmlFile of xmls) {
                const xmlContent = xmlFile.buffer.toString('utf-8');
                const parsedData = await this.parseXMLInvoice(xmlContent);
                if (parsedData && (parsedData.supplierRuc || parsedData.supplierName || parsedData.total)) {
                  parsedData.messageId = msgRef.id;
                  parsedData.attachmentId = att.attachmentId;
                  if (!parsedData.claveAcceso) {
                    parsedData.claveAcceso = msgRef.id;
                  }
                  messageInvoices.push(parsedData);
                  hasSuccessfulXml = true;
                }
              }
            }
          } catch (err) {
            console.error(`Failed to process ZIP attachment ${att.filename}:`, err);
          }
        }

        // 3. Process PDF files ONLY if no XML parsed successfully for this message
        if (!hasSuccessfulXml) {
          // Process PDFs inside ZIP files first
          for (const extZip of extractedZips) {
            for (const pdfFile of extZip.pdfs) {
              if (req.geminiApiKey) {
                const parsedData = await this.parsePDFInvoice(pdfFile.buffer, req.geminiApiKey);
                if (parsedData && (parsedData.supplierRuc || parsedData.supplierName || parsedData.total)) {
                  parsedData.messageId = msgRef.id;
                  parsedData.attachmentId = extZip.attachmentId;
                  if (!parsedData.claveAcceso) {
                    parsedData.claveAcceso = msgRef.id;
                  }
                  messageInvoices.push(parsedData);
                }
              }
            }
          }

          // Process direct PDF attachments
          for (const att of pdfAttachments) {
            try {
              const attachment = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: msgRef.id!,
                id: att.attachmentId,
              });
              const dataBase64Url = attachment.data.data;
              if (dataBase64Url) {
                const buffer = Buffer.from(dataBase64Url, 'base64');
                if (req.geminiApiKey) {
                  const parsedData = await this.parsePDFInvoice(buffer, req.geminiApiKey);
                  if (parsedData && (parsedData.supplierRuc || parsedData.supplierName || parsedData.total)) {
                    parsedData.messageId = msgRef.id;
                    parsedData.attachmentId = att.attachmentId;
                    if (!parsedData.claveAcceso) {
                      parsedData.claveAcceso = msgRef.id;
                    }
                    messageInvoices.push(parsedData);
                  }
                }
              }
            } catch (err) {
              console.error(`Failed to process direct PDF attachment ${att.filename}:`, err);
            }
          }
        }

        results.push(...messageInvoices);
      } catch (msgError) {
        console.error(`Failed to retrieve details for message ID ${msgRef.id}:`, msgError);
      }
    }

    return results;
  }

  /**
   * Downloads a PDF invoice attachment from a message. If the attachment is a ZIP file,
   * it will extract and return the PDF file from within the ZIP.
   */
  public async downloadInvoicePDF(params: {
    gmailMessageId: string;
    gmailAttachmentId: string;
    accessToken: string;
    clientId: string;
    clientSecret: string;
    targetPdfFilename?: string;
  }): Promise<{ filename: string; mimeType: string; buffer: Buffer }> {
    // Setup OAuth2 client
    const oauth2Client = new google.auth.OAuth2(params.clientId, params.clientSecret);
    oauth2Client.setCredentials({ access_token: params.accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 1. Fetch message details to find the attachment metadata (filename, mimeType)
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: params.gmailMessageId,
    });

    // Find the part matching the attachmentId
    let targetPart: any = null;
    const findPart = (parts: any[]) => {
      for (const part of parts) {
        if (part.body?.attachmentId === params.gmailAttachmentId) {
          targetPart = part;
          return;
        }
        if (part.parts && part.parts.length > 0) {
          findPart(part.parts);
        }
      }
    };

    if (msg.data.payload?.parts) {
      findPart(msg.data.payload.parts);
    } else if (msg.data.payload?.body?.attachmentId === params.gmailAttachmentId) {
      targetPart = msg.data.payload;
    }

    if (!targetPart) {
      throw new Error(`Attachment with ID ${params.gmailAttachmentId} not found in message ${params.gmailMessageId}`);
    }

    const filename = targetPart.filename || 'attachment';
    const mimeType = targetPart.mimeType || 'application/octet-stream';
    const ext = filename.split('.').pop()?.toLowerCase();

    // 2. Fetch the attachment content
    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: params.gmailMessageId,
      id: params.gmailAttachmentId,
    });

    const dataBase64Url = attachment.data.data;
    if (!dataBase64Url) {
      throw new Error(`No data found for attachment ${params.gmailAttachmentId}`);
    }

    const attachmentBuffer = Buffer.from(dataBase64Url, 'base64');

    // 3. Handle ZIP files
    if (ext === 'zip') {
      const zip = new AdmZip(attachmentBuffer);
      const zipEntries = zip.getEntries();
      
      let pdfEntry: any = null;
      if (params.targetPdfFilename) {
        pdfEntry = zipEntries.find(entry => entry.entryName === params.targetPdfFilename || entry.entryName.endsWith('/' + params.targetPdfFilename));
      } else {
        // Find first PDF
        pdfEntry = zipEntries.find(entry => entry.entryName.split('.').pop()?.toLowerCase() === 'pdf');
      }

      if (!pdfEntry) {
        throw new Error(`No PDF file found inside the ZIP attachment`);
      }

      return {
        filename: pdfEntry.entryName.split('/').pop() || pdfEntry.entryName,
        mimeType: 'application/pdf',
        buffer: pdfEntry.getData(),
      };
    }

    // 4. Handle direct PDF files (or fallback if it's not a ZIP)
    return {
      filename,
      mimeType,
      buffer: attachmentBuffer,
    };
  }

  private cleanParsedData(data: ParsedInvoiceData): ParsedInvoiceData {
    return Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
    ) as ParsedInvoiceData;
  }
}
