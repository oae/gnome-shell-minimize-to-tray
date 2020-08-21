declare global {
  function _(arg: string): string;
}

export type MttInfo = {
  className: string;
  icon?: string;
  enabled: boolean;
  startHidden: boolean;
  keybinding: Array<string>;
};

export type MttWindow = {
  xid: string;
  hidden: boolean;
  className: string;
  lastUpdatedAt: Date;
};

export {};
