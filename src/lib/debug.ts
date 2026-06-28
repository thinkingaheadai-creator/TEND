const enabled = process.env.NODE_ENV !== "production";

export const debug = {
  log: (...a: unknown[]) => {
    if (enabled) console.log(...a);
  },
  info: (...a: unknown[]) => {
    if (enabled) console.info(...a);
  },
};
