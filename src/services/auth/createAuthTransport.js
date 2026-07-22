import { isBffAuthMode } from "./authMode";
import DirectAuthTransport from "./DirectAuthTransport";
import BffAuthTransport from "./BffAuthTransport";

export function createAuthTransport() {
  if (isBffAuthMode()) {
    const transport = new BffAuthTransport();
    // Drop any leftover Direct-mode tokens from a previous deploy/mode
    transport.scrubLegacyTokenStorage();
    return transport;
  }
  return new DirectAuthTransport();
}
