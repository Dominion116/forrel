"use client";

import { toHex, type EncodedMessage } from "@forrel/core";

import { HashDisplay } from "@/components/ui/hash-display";

/**
 * The exact bytes being signed, field by field (name, packed type, value, byte count),
 * then the whole message as raw hex.
 */
export function MessageFieldTable({ message, showRaw = true }: { message: EncodedMessage; showRaw?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-body-sm">
          <caption className="sr-only">Signed message fields</caption>
          <thead>
            <tr className="border-y border-dashed border-hairline text-muted-foreground">
              <th scope="col" className="py-3 pr-4 font-normal">Field</th>
              <th scope="col" className="py-3 pr-4 font-normal">Type</th>
              <th scope="col" className="py-3 pr-4 font-normal">Value</th>
              <th scope="col" className="py-3 text-right font-normal">Bytes</th>
            </tr>
          </thead>
          <tbody>
            {message.fields.map((f) => (
              <tr key={f.name} className="border-b border-dashed border-hairline align-top">
                <th scope="row" className="py-3 pr-4 font-normal text-foreground">{f.name}</th>
                <td className="py-3 pr-4 text-muted-foreground">{f.type}</td>
                <td className="max-w-[28rem] py-3 pr-4 break-all">
                  {f.display}
                  {f.display !== toHex(f.bytes) && (
                    <span className="mt-1 block text-muted-foreground">{toHex(f.bytes)}</span>
                  )}
                </td>
                <td className="py-3 text-right tabular-nums text-muted-foreground">{f.bytes.length}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="py-3 text-muted-foreground">Total</td>
              <td className="py-3 text-right tabular-nums">{message.bytes.length}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {showRaw && (
        <details className="group">
          <summary className="cursor-pointer list-none text-body-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show raw message hex</span>
            <span className="hidden group-open:inline">Hide raw message hex</span>
          </summary>
          <div className="mt-3 border border-dashed border-hairline bg-surface p-3">
            <HashDisplay value={message.hex} label="raw message" full />
          </div>
        </details>
      )}
    </div>
  );
}
