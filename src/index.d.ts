declare global {
  function _(arg: string): string;
}

export type MttInfo = {
  className: string;
  icon?: string;
  enabled: boolean;
};

export type MttWindow = {
  xid: string;
  hidden: boolean;
  className: string;
};

export {};
