import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Forrel — Releases that still verify after Q-Day";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Share card in the landing page's look: black field, lime bar, big headline.
 * If `public/illustrations/og-art.png` exists it is placed on the right half.
 */
export default async function OpenGraphImage() {
  let art: string | null = null;
  try {
    const buf = await readFile(path.join(process.cwd(), "public/illustrations/og-art.png"));
    art = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    art = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#000000",
          color: "#f2f2f2",
          position: "relative",
          fontFamily: "monospace",
        }}
      >
        {art && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art}
            alt=""
            width={630}
            height={630}
            style={{ position: "absolute", right: 0, top: 0, width: 630, height: 630, objectFit: "cover" }}
          />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px",
            width: art ? 720 : "100%",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 8 }}>FORREL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div
              style={{
                fontSize: 76,
                lineHeight: 1,
                letterSpacing: -3,
                fontFamily: "sans-serif",
                fontWeight: 600,
                maxWidth: 640,
              }}
            >
              Releases that still verify after Q-Day.
            </div>
            <div
              style={{
                display: "flex",
                background: "#daff52",
                color: "#0a0a0a",
                padding: "14px 22px",
                fontSize: 20,
                letterSpacing: 5,
                alignSelf: "flex-start",
              }}
            >
              SHA3-256 · ML-DSA-87 · CHECKED ON-CHAIN
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
