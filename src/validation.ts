import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const MAX_EMAILS = 200;
const MAX_QUERY_LENGTH = 1000;

const email = z.string().trim().email().max(254);
// Empty strings are treated as "not provided" so the controllers keep answering with their own
// "missing parameter" 400. Non-array lists are likewise left to the controllers' own check.
const optionalEmail = z.union([z.literal(''), email]).optional();
const emailList = z.unknown().superRefine((value, ctx) => {
  if (!Array.isArray(value)) return;
  if (value.length > MAX_EMAILS) {
    ctx.addIssue({ code: 'custom', message: `must contain at most ${MAX_EMAILS} emails` });
    return;
  }
  value.forEach((item, index) => {
    if (!email.safeParse(item).success) {
      ctx.addIssue({ code: 'custom', path: [index], message: 'must be a valid email' });
    }
  });
});
const isoDate = z
  .string()
  .refine((value) => value === '' || !Number.isNaN(Date.parse(value)), { message: 'must be a valid date' });

// Missing/empty required fields keep the historical messages (the controllers own those 400s
// and their Spanish userMessage). zod only rejects values that are present but malformed.
const scanBase = {
  accountEmail: optionalEmail,
  sinceDate: isoDate.optional(),
  q: z.string().max(MAX_QUERY_LENGTH).optional(),
  geminiApiKey: z.string().max(256).optional(),
};

export const scanSchema = z.object({
  ...scanBase,
  supplierEmails: emailList.optional(),
});

export const scanSentSchema = z.object({
  ...scanBase,
  clientEmails: emailList.optional(),
});

export const downloadPdfSchema = z.object({
  accountEmail: optionalEmail,
  messageId: z.string().max(128).optional(),
  attachmentId: z.string().max(1024).optional(),
  filename: z.string().max(255).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  allowedAccounts: z.array(email).max(MAX_EMAILS).optional(),
});

export const emailParamSchema = z.object({ email });

type Source = 'body' | 'query' | 'params';

function invalidRequest(res: Response, error: z.ZodError): void {
  const detail = error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ');
  res.status(400).json({
    userMessage: 'Los datos enviados no son válidos.',
    technicalError: `Invalid request: ${detail}`,
  });
}

/**
 * Validates the given part of the request. Values that are present but malformed produce a 400;
 * fields that are simply absent are left to the controllers, which already own those messages.
 * Unknown properties are preserved (the scan endpoints have historically ignored extras).
 */
export const validate =
  (schema: z.ZodType, source: Source = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const target = source === 'body' ? (req.body ?? {}) : req[source];
    const result = schema.safeParse(target);
    if (!result.success) {
      invalidRequest(res, result.error);
      return;
    }
    next();
  };

/** downloadPDF reads from query and body merged, so validate that same merge. */
export const validateDownloadPdf = (req: Request, res: Response, next: NextFunction): void => {
  const result = downloadPdfSchema.safeParse({ ...req.query, ...(req.body ?? {}) });
  if (!result.success) {
    invalidRequest(res, result.error);
    return;
  }
  next();
};
