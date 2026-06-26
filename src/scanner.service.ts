import { google } from 'googleapis';
import AdmZip from 'adm-zip';
import * as xml2js from 'xml2js';

export interface ScanRequest {
  accessToken: string;
  refreshToken?: string;
  clientId: string;
  clientSecret: string;
  supplierEmails: string[];
  sinceDate?: string; // ISO date string
}

export interface ParsedItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface ParsedInvoiceData {
  supplierRuc?: string;
  supplierName?: string;
  total?: number;
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
          if (nombre) {
            items.push({ nombre, cantidad, precioUnitario });
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
        if (nombre) {
          items.push({ nombre, cantidad, precioUnitario });
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
        
        if (nombre) {
          items.push({ nombre, cantidad, precioUnitario });
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
      const result = await parser.parseStringPromise(xmlContent);

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
        }
      }

      let ruc = '';
      let name = '';
      let total = 0;
      let items: ParsedItem[] | undefined = [];

      const rootNode = result[rootKey] || result;

      if (format === 'DTE') {
        const emisor = rootNode.Documento?.[0]?.Encabezado?.[0]?.Emisor?.[0] || this.findDeepValue(rootNode, 'emisor');
        ruc = this.getText(this.findDeepValue(emisor, 'rutemisor'));
        name = this.getText(this.findDeepValue(emisor, 'rznsoc') || this.findDeepValue(emisor, 'rznsocemisor'));
        
        const totales = rootNode.Documento?.[0]?.Encabezado?.[0]?.Totales?.[0] || this.findDeepValue(rootNode, 'totales');
        total = parseFloat(this.getText(this.findDeepValue(totales, 'mnttotal')) || '0');
        
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
        
        items = this.extractItems(rootNode, 'UBL');
      } else if (format === 'CFDI') {
        const emisor = rootNode['cfdi:Emisor']?.[0] || this.findDeepValue(rootNode, 'emisor');
        if (emisor && emisor.$) {
          ruc = emisor.$.Rfc || emisor.$.rfc || '';
          name = emisor.$.Nombre || emisor.$.nombre || '';
        }
        
        if (rootNode.$) {
          total = parseFloat(rootNode.$.Total || rootNode.$.total || '0');
        }
        
        items = this.extractItems(rootNode, 'CFDI');
      } else {
        ruc = this.getText(this.findDeepValue(rootNode, 'rutemisor') || this.findDeepValue(rootNode, 'ruc') || this.findDeepValue(rootNode, 'rfc'));
        name = this.getText(this.findDeepValue(rootNode, 'rznsocemisor') || this.findDeepValue(rootNode, 'rznsoc') || this.findDeepValue(rootNode, 'razonsocial') || this.findDeepValue(rootNode, 'name'));
        total = parseFloat(this.getText(this.findDeepValue(rootNode, 'mnttotal') || this.findDeepValue(rootNode, 'importetotal') || this.findDeepValue(rootNode, 'total')) || '0');
      }

      return {
        supplierRuc: ruc || undefined,
        supplierName: name || undefined,
        total: total || undefined,
        items: items || undefined,
      };
    } catch (error) {
      console.error('Failed to parse XML invoice:', error);
      return undefined;
    }
  }

  /**
   * Scans a Gmail inbox for messages from matching supplier emails and downloads invoice attachments.
   */
  public async scanInbox(req: ScanRequest): Promise<ScanResponseItem[]> {
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
    const results: ScanResponseItem[] = [];

    // Formulate search date (default to 30 days ago if not provided)
    let afterQuery = '';
    if (req.sinceDate) {
      const date = new Date(req.sinceDate);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      afterQuery = ` after:${yyyy}/${mm}/${dd}`;
    } else {
      const date = new Date();
      date.setDate(date.getDate() - 30); // 30 days ago
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
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

        const headers = msg.data.payload?.headers || [];
        const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || 'Sin Asunto';
        const dateStr = headers.find((h) => h.name?.toLowerCase() === 'date')?.value || '';
        const emailDate = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
        const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
        
        // Extract email address from From header (e.g., "Supplier Name <email@supplier.com>" -> "email@supplier.com")
        const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader];
        const senderEmail = (emailMatch[1] || fromHeader).trim().toLowerCase();

        // Recursively extract attachments from payload parts
        const handleParts = async (parts: any[]) => {
          for (const part of parts) {
            const filename = part.filename;
            const attachmentId = part.body?.attachmentId;

            if (part.parts && part.parts.length > 0) {
              await handleParts(part.parts);
            }

            if (filename && attachmentId) {
              const ext = filename.split('.').pop()?.toLowerCase();
              const allowedExtensions = ['pdf', 'xml', 'zip'];
              
              if (ext && allowedExtensions.includes(ext)) {
                // Fetch the actual attachment contents
                const attachment = await gmail.users.messages.attachments.get({
                  userId: 'me',
                  messageId: msgRef.id!,
                  id: attachmentId,
                });

                const dataBase64Url = attachment.data.data;
                if (!dataBase64Url) continue;

                // Decode base64url to Buffer
                const buffer = Buffer.from(dataBase64Url, 'base64');

                if (ext === 'pdf') {
                  results.push({
                    gmailMessageId: msgRef.id!,
                    gmailAttachmentId: attachmentId,
                    filename,
                    mimeType: part.mimeType || 'application/pdf',
                    fileBase64: buffer.toString('base64'),
                    emailSubject: subject,
                    emailDate,
                    senderEmail,
                  });
                } else if (ext === 'xml') {
                  const xmlContent = buffer.toString('utf-8');
                  const parsedData = await this.parseXMLInvoice(xmlContent);
                  results.push({
                    gmailMessageId: msgRef.id!,
                    gmailAttachmentId: attachmentId,
                    filename,
                    mimeType: part.mimeType || 'text/xml',
                    fileBase64: buffer.toString('base64'),
                    emailSubject: subject,
                    emailDate,
                    senderEmail,
                    parsedData,
                  });
                } else if (ext === 'zip') {
                  // Process ZIP using adm-zip
                  try {
                    const zip = new AdmZip(buffer);
                    const zipEntries = zip.getEntries();
                    
                    for (const entry of zipEntries) {
                      if (entry.isDirectory) continue;
                      
                      const zipFilename = entry.entryName.split('/').pop() || entry.entryName;
                      const zipExt = zipFilename.split('.').pop()?.toLowerCase();
                      
                      if (zipExt === 'pdf') {
                        const fileBuffer = entry.getData();
                        results.push({
                          gmailMessageId: msgRef.id!,
                          gmailAttachmentId: attachmentId, // Shares attachment ID, filename is unique
                          filename: zipFilename,
                          mimeType: 'application/pdf',
                          fileBase64: fileBuffer.toString('base64'),
                          emailSubject: subject,
                          emailDate,
                          senderEmail,
                        });
                      } else if (zipExt === 'xml') {
                        const fileBuffer = entry.getData();
                        const xmlContent = fileBuffer.toString('utf-8');
                        const parsedData = await this.parseXMLInvoice(xmlContent);
                        results.push({
                          gmailMessageId: msgRef.id!,
                          gmailAttachmentId: attachmentId,
                          filename: zipFilename,
                          mimeType: 'text/xml',
                          fileBase64: fileBuffer.toString('base64'),
                          emailSubject: subject,
                          emailDate,
                          senderEmail,
                          parsedData,
                        });
                      }
                    }
                  } catch (zipError) {
                    console.error(`Failed to process ZIP attachment ${filename}:`, zipError);
                  }
                }
              }
            }
          }
        };

        if (msg.data.payload?.parts) {
          await handleParts(msg.data.payload.parts);
        } else if (msg.data.payload?.body?.attachmentId) {
          // If the message body itself is an attachment (rare but possible)
          await handleParts([msg.data.payload]);
        }
      } catch (msgError) {
        console.error(`Failed to retrieve details for message ID ${msgRef.id}:`, msgError);
      }
    }

    return results;
  }
}
