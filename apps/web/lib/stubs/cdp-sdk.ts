/*
 * Stands in for @coinbase/cdp-sdk (see next.config.ts).
 *
 * RainbowKit loads the Base Account connector, whose server build imports CdpClient for
 * server-side payment functions that Forrel never calls. The real SDK pulls in optional
 * @x402 packages that are not installed, which breaks Next.js Turbopack builds.
 */
export class CdpClient {
  constructor() {
    throw new Error("Coinbase CDP payments are not available in Forrel.");
  }
}
