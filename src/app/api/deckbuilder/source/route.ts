import { NextResponse } from "next/server";
import { z } from "zod";
import { DeckSourceService, toDeckSourceResultView } from "@/modules/deckbuilder";
import { requireApiAppUser } from "@/server/auth";

const querySchema = z.object({
  mode: z.enum(["all", "library"]),
  query: z.string().optional(),
  colors: z.string().optional(),
  typeLine: z.string().optional(),
  commanderOnly: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(36).optional(),
});

function parseColors(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const colors = value
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);

  return colors.length > 0 ? colors : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const parsed = querySchema.safeParse({
    mode: url.searchParams.get("mode") ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
    colors: url.searchParams.get("colors") ?? undefined,
    typeLine: url.searchParams.get("typeLine") ?? undefined,
    commanderOnly: url.searchParams.get("commanderOnly") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const auth = parsed.data.mode === "library" ? await requireApiAppUser() : { appUser: null, response: null };
  if (auth.response) {
    return auth.response;
  }

  const service = new DeckSourceService(auth.appUser?.appUserId);
  const colors = parseColors(parsed.data.colors);
  const payload = await service.execute({
    mode: parsed.data.mode,
    ...(parsed.data.query ? { query: parsed.data.query } : {}),
    ...(colors ? { colors } : {}),
    ...(parsed.data.typeLine ? { typeLine: parsed.data.typeLine } : {}),
    ...(parsed.data.commanderOnly !== undefined
      ? { commanderOnly: parsed.data.commanderOnly === "true" }
      : {}),
    ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
  });

  return NextResponse.json({ data: toDeckSourceResultView(payload) });
}
