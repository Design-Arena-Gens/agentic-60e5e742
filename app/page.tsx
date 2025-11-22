"use client";
import React, { useMemo, useRef, useState } from "react";

type Platform = "Wildberries" | "Ozon" | "??????.??????";
type Fulfillment = "FBO" | "FBS";

export default function Page() {
  const [niche, setNiche] = useState("?????????? ??? ??????????");
  const [budget, setBudget] = useState(30000);
  const [platforms, setPlatforms] = useState<Platform[]>(["Wildberries", "Ozon"]);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("FBO");
  const [supplierRegion, setSupplierRegion] = useState("??????");
  const [targetMargin, setTargetMargin] = useState(25);
  const [notes, setNotes] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string>("");
  const [checklist, setChecklist] = useState<{ label: string; done: boolean }[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const platformsAsString = useMemo(() => platforms.join(", "), [platforms]);

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function runAgent() {
    setRunning(true);
    setLog("");
    setChecklist([]);
    setResultUrl(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          budget,
          platforms,
          fulfillment,
          supplierRegion,
          targetMargin,
          notes
        }),
        signal: controller.signal
      });
      if (!res.ok || !res.body) throw new Error("?????? ????");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Split by lines
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";
        for (const line of parts) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "log") {
              setLog((prev) => prev + msg.text + "\n");
            } else if (msg.type === "check") {
              setChecklist((prev) => {
                const idx = prev.findIndex((c) => c.label === msg.label);
                if (idx === -1) return [...prev, { label: msg.label, done: msg.done }];
                const copy = prev.slice();
                copy[idx] = { label: msg.label, done: msg.done };
                return copy;
              });
            } else if (msg.type === "result") {
              setResultUrl(msg.url || null);
            }
          } catch {
            // ignore bad lines
          }
        }
      }
      if (buffer.trim()) {
        try {
          const msg = JSON.parse(buffer.trim());
          if (msg.type === "log") setLog((prev) => prev + msg.text + "\n");
        } catch {}
      }
    } catch (e: any) {
      setLog((prev) => prev + "??????: " + (e?.message || String(e)) + "\n");
    } finally {
      setRunning(false);
    }
  }

  function stopAgent() {
    controllerRef.current?.abort();
    setRunning(false);
  }

  return (
    <div className="grid">
      <section className="card">
        <div className="fieldset">
          <div className="row">
            <div>
              <label>????</label>
              <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="????????, ?????? ??? ?????" />
            </div>
            <div>
              <label>?????? ?? ???????, ?/???</label>
              <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            </div>
          </div>
          <div className="row">
            <div>
              <label>????????</label>
              <div className="actions">
                {(["Wildberries", "Ozon", "??????.??????"] as Platform[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => togglePlatform(p)}
                    aria-pressed={platforms.includes(p)}
                    title={p}
                  >
                    {platforms.includes(p) ? "? " : "? "} {p}
                  </button>
                ))}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                ???????: <span className="pill">{platformsAsString || "?"}</span>
              </div>
            </div>
            <div>
              <label>?????????? ???????</label>
              <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value as Fulfillment)}>
                <option value="FBO">FBO (?? ????? ????????????)</option>
                <option value="FBS">FBS (?? ?????? ????????)</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div>
              <label>?????? ???????????</label>
              <select value={supplierRegion} onChange={(e) => setSupplierRegion(e.target.value)}>
                <option>??????</option>
                <option>?????</option>
                <option>??????</option>
              </select>
            </div>
            <div>
              <label>??????? ?????, %</label>
              <input type="number" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label>??????????? ? ???????????</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="????????: ?? ???????? ?? ??, ?????? ??????????????? ????????? ? ?.?." />
          </div>
          <div className="actions">
            {!running ? (
              <button className="btn btn-primary" onClick={runAgent}>
                ????????? ??????
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={stopAgent}>
                ??????????
              </button>
            )}
            <span className="muted">????? ??????????? ???? ? ???? ??????????</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>??? ??????</h3>
        <div className="log" aria-live="polite">{log || "???????? ???????..."}</div>
        <h4 style={{ marginTop: 16, marginBottom: 8 }}>????????</h4>
        <ul className="list">
          {checklist.length === 0 && <li className="muted">?????? ???????? ?? ????? ?????? ??????</li>}
          {checklist.map((c) => (
            <li key={c.label}>
              <span>{c.label}</span>
              <span className={c.done ? "success" : "warn"}>{c.done ? "??????" : "? ????????"}</span>
            </li>
          ))}
        </ul>
        {resultUrl && (
          <div style={{ marginTop: 12 }}>
            <a className="btn btn-primary" href={resultUrl} target="_blank" rel="noreferrer">
              ??????? ?????????
            </a>
          </div>
        )}
      </section>
    </div>
  );
}

