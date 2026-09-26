/**
 * NOTE: The production NetFree/offline build is maintained externally by the
 * Connect & Thrive / hagitmualem.com project, which builds incremental offline
 * releases from the published achotikala.com production version.
 * This folder only holds runtime helpers — no packaging/updater lives here.
 */
import { IS_OFFLINE_BUILD } from "./offlineContent";

/**
 * האם האפליקציה רצה בגרסה המקומית (תיקייה / file://).
 * נכון גם כשהמעטפת המקומית מסמנת אותנו בזמן ריצה.
 */
export const IS_OFFLINE_RUNTIME =
  IS_OFFLINE_BUILD ||
  (typeof window !== "undefined" &&
    Boolean((window as unknown as { ACHOTIKALA_OFFLINE_HOST?: unknown }).ACHOTIKALA_OFFLINE_HOST));
