import { z } from "zod";
export const UUID = z.string().uuid();
export const Email = z.string().email();
export const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD
export const Timestamp = z.string();
export type UUID = z.infer<typeof UUID>;
export type Email = z.infer<typeof Email>;