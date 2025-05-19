import { Option } from "../BaseOptions/AbstractOption";

/** Roles applicable by user or developer interaction recording */
export type ApplicableHistoryRole = "user" | "developer";
/** All possible history roles, including agent response */
export type HistoryRole = ApplicableHistoryRole | "agent";

// DO not use history for rollback reasons, as this is being stored by each option implicitly!
// => you may use HistoryEntry to resolve your Errors in onFailure
//    or lookup stuff during engagement.
export interface HistoryEntry {
  role: HistoryRole;
  message: string;
  type?: "input" | "output" | "decision" | "systemNotice" | "separator" | "error";
  timestamp?: Date;
  inContextOf?: Option<any, any>;
  details?: { payload: any };
  previousEntry?: HistoryEntry;
}
