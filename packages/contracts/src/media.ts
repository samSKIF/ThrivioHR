import { z } from "zod";
import { UUID } from "./primitives";
export const MediaKind = z.enum(["avatar","cover"]);
export const UserMedia = z.object({
userId: UUID,
kind: MediaKind,
storageKey: z.string(),
version: z.number(),
width: z.number().optional(),
height: z.number().optional(),
mime: z.string().optional(),
isDefault: z.boolean().optional(),
});
export type UserMedia = z.infer<typeof UserMedia>;