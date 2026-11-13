import { useState, type FormEvent } from "react";
import { Button } from "~/components/button/button.component";
import { postForJson, useAppSnapshot } from "~/lib/storage/storage.client";
import { LOGIN_CARD } from "./login-card.config";
import type { LoginCardProps } from "./login-card.types";

/** Local JSON import replaces every former Steam login entry point. */
export function LoginCard({
  framed = true,
  headingId,
  bodyId,
  headingLevel = 2,
  targetId,
}: LoginCardProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const { accounts } = useAppSnapshot();
  const target = accounts.find((account) => account.steamId === targetId);
  const [label, setLabel] = useState(target?.displayName ?? "My imported inventory");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (
        !files.length ||
        files.length > 100 ||
        files.reduce((size, file) => size + file.size, 0) > 20 * 1024 * 1024
      )
        throw new Error("Choose 1–100 JSON files, at most 20 MiB combined.");
      const pages: unknown[] = [];
      for (const file of [...files].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      )) {
        let value: unknown;
        try {
          value = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
        } catch {
          throw new Error(`Could not parse ${file.name}. Choose a raw JSON response body.`);
        }
        if (Array.isArray(value)) pages.push(...value);
        else pages.push(value);
      }
      await postForJson("/api/import", {
        label,
        pages,
        ...(targetId ? { portfolioId: targetId } : {}),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";
  return (
    <div className={framed ? LOGIN_CARD.frameClass : undefined}>
      <Heading id={headingId} className={LOGIN_CARD.headingClass}>
        {target ? "Replace imported inventory" : "Import your CS2 inventory"}
      </Heading>
      <p id={bodyId} className={LOGIN_CARD.bodyClass}>
        Choose Steam inventory JSON files. No Steam sign-in, cookies, or API key are needed. The
        normalized items stay on this computer.
      </p>
      <form onSubmit={(event) => void submit(event)} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm">
          Portfolio name
          <input
            className={inputClass}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
            maxLength={64}
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Inventory JSON pages
          <input
            className={inputClass}
            type="file"
            accept=".json,application/json"
            multiple
            required
            disabled={busy}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Use the same portfolio name to replace its latest item state. Use another name for another
          inventory. Export age and account ownership cannot be verified.
        </p>
        {error && (
          <p role="alert" className={LOGIN_CARD.errorClass}>
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Importing…" : target ? "Replace inventory" : "Import inventory"}
        </Button>
      </form>
      <details className="mt-4 text-sm">
        <summary>How to export inventory JSON</summary>
        <p className="mt-2 break-words">
          In your own browser signed in to Steam, open
          https://steamcommunity.com/inventory/YOUR_STEAMID/730/2?l=english&amp;count=2000 and save
          the response as 01.json. If more_items is 1, append &amp;start_assetid=LAST_ASSETID and
          save the next page. Continue until more_items is 0, then select all pages together.
          Context 16 exports are also supported. Choose JSON response bodies only; never upload
          cookies, HAR files, or copied cURL commands. Standard exports omit storage-unit contents,
          exact floats, paint seeds, and some attachment data.
        </p>
      </details>
    </div>
  );
}
