import './styles/stylesheet.scss';

import { logger } from './utils';
import { WindowListener } from './window/listener';

const debug = logger('extension');

export class MttExtension {
  private listener: WindowListener;

  constructor() {
    this.listener = new WindowListener();
    debug('extension is initialized');
  }

  enable(): void {
    this.listener.startListening();
    debug('extension is enabled');
  }

  disable(): void {
    this.listener.stopListening();
    debug('extension is disabled');
  }
}

export default function (): MttExtension {
  return new MttExtension();
}
