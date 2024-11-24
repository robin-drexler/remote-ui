/** @jsxRuntime automatic */
/** @jsxImportSource react */
import {createEndpoint, fromInsideIframe, retain} from '@remote-ui/rpc';
import {createRoot, createRemoteRoot} from '@remote-ui/react';

import * as components from './components';
import {App} from './app';

const endpoint = createEndpoint(fromInsideIframe());
endpoint.expose({
  render(channel) {
    retain(channel);

    const remoteRoot = createRemoteRoot(channel, {
      components: Object.keys(components),
    });

    const modal = remoteRoot.createFragment();
    modal.appendChild(remoteRoot.createComponent('Modal', {}, ['Hello']));
    const button = remoteRoot.createComponent('Button', {modal}, ['click me']);

    remoteRoot.appendChild(button);

    setTimeout(() => {
      const mewModal = remoteRoot.createFragment();
      mewModal.appendChild(
        remoteRoot.createComponent('Modal', {}, ['Hello from the new side']),
      );

      button.updateProps({modal: mewModal});
    }, 1000);

    // createRoot(remoteRoot).render(<App />);
    remoteRoot.mount();
  },
});
