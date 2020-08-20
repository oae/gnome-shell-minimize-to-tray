import './styles/stylesheet.scss';

import { logger } from '@mtt/utils';
import { WindowListener } from '@mtt/window/listener';

const debug = logger('extension');

class MttExtension {
  private listener: WindowListener;

  constructor() {
    this.listener = new WindowListener();
    debug('extension is initialized');
  }

  enable(): void {
    this.listener.enable();
    debug('extension is enabled');
  }

  disable(): void {
    this.listener.disable();
    debug('extension is disabled');
  }
}

export default function (): MttExtension {
  return new MttExtension();
}
