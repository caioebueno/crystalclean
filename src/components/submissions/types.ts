import type { PipeState } from "@/lib/pipelineStages";

/** One quote request as the Submissions board sees it. Built on the server. */
export type BoardLead = {
  id: string;
  name: string;
  phone: string; // as typed
  e164: string; // digits with country code, for tel:/sms:/wa.me
  phoneFmt: string;
  receivedAt: string;
  src: string;
  home: string; // "Home · 34785 · 3 bed · 2½ bath"
  price: string;
  address: string;
  zip: string;
  rows: { k: string; v: string }[];
  link?: { id: string; tag: string; customerId?: string };
  /** What's stored for this request, or null when the stage is derived (new, or from a booking link). */
  saved: PipeState | null;
  state: PipeState;
};
