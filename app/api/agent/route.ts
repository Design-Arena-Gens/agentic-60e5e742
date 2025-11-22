import { NextRequest } from "next/server";
import { createPlan, runWorkflow } from "@/lib/agent";

export const runtime = "nodejs";

function write(stream: WritableStreamDefaultWriter<Uint8Array>, obj: any) {
  const encoder = new TextEncoder();
  return stream.write(encoder.encode(JSON.stringify(obj) + "\n"));
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  const { niche, budget, platforms, fulfillment, supplierRegion, targetMargin, notes } = payload ?? {};
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      await write(writer, { type: "log", text: "?? ?????? ?????? ????????????..." });
      await write(writer, { type: "log", text: `????: ${niche || "?"}` });
      await write(writer, { type: "log", text: `??????: ${budget ?? "?"} ?/???` });
      await write(writer, { type: "log", text: `????????: ${Array.isArray(platforms) ? platforms.join(", ") : "?"}` });
      await write(writer, { type: "log", text: `??????????: ${fulfillment || "?"}` });
      await write(writer, { type: "log", text: `??????????: ${supplierRegion || "?"}` });
      await write(writer, { type: "log", text: `??????? ?????: ${targetMargin ?? "?"}%` });
      if (notes) await write(writer, { type: "log", text: `???????: ${notes}` });

      await write(writer, { type: "check", label: "?????????? ??????", done: true });
      await write(writer, { type: "log", text: "?? ???????????? ?????????..." });
      const plan = await createPlan({
        niche,
        budget,
        platforms,
        fulfillment,
        supplierRegion,
        targetMargin,
        notes
      });
      await write(writer, { type: "log", text: "????????? ????????????." });
      await write(writer, { type: "check", label: "?????????", done: true });

      await write(writer, { type: "log", text: "?? ?????????? ???????? ????????..." });
      const result = await runWorkflow(plan, (event) => write(writer, event));

      if (result?.url) {
        await write(writer, { type: "log", text: `? ????????? ?????: ${result.url}` });
        await write(writer, { type: "result", url: result.url });
      } else {
        await write(writer, { type: "log", text: "? ?????? ?????????." });
      }
    } catch (e: any) {
      await write(writer, { type: "log", text: `? ??????: ${e?.message || String(e)}` });
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

