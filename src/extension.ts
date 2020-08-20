import './styles/stylesheet.scss';

import { logger, getMissingDeps } from '@mtt/utils';
import { WindowListener } from '@mtt/window/listener';
const debug = logger('extension');

class MttExtension {
  private listener: WindowListener;

  constructor() {
    const missingDeps = getMissingDeps();

    if (missingDeps.length > 0) {
      debug(`Failed to enable minimize-to-tray extension. ${missingDeps.join(', ')} application/s are not installed`);
      throw new Error(`Failed to enable minimize-to-tray. ${missingDeps.join(', ')} application/s are not installed`);
    }

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
