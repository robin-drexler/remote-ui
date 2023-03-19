import {retain, createEndpoint} from '@remote-ui/rpc';
import {createRoot, createRemoteRoot} from '@remote-ui/react';

import {RemoteApp} from './app';
import type {Endpoint} from '../types';

self.extensions = [];

self.addExtension = (renderer, setup) => {
  self.extensions.push({renderer, setup});
  self.extensions.push({renderer, setup});
  self.extensions.push({renderer, setup});
  self.extensions.push({renderer, setup});
  self.extensions.push({renderer, setup});
  self.extensions.push({renderer, setup});
};

const endpoint = createEndpoint<Endpoint>(self, {
  callable: ['render', 'renderExtension'],
});

let dataLoaders = null;

endpoint.expose({
  async loadExtension() {
    await import(`./extension.js`);
  },
  async render(receiver, api, index) {
    const extension = self.extensions[index];

    retain(receiver);
    retain(api);
    const remoteRoot = createRemoteRoot(receiver, {components: ['Button']});
    const root = createRoot(remoteRoot);

    if (!dataLoaders) {
      dataLoaders = setupDataLoaders(extension.setup(api).dataLoaders);
    }

    const element = extension.renderer({...api, index, dataLoaders});
    root.render(element);
    await remoteRoot.mount();
  },
});

function setupDataLoaders(dataLoaders) {
  const loaders = Object.entries(dataLoaders).map(([key, loadBatch]) => {
    return [key, new DataLoader(loadBatch)];
  });

  return Object.fromEntries(loaders);
}

class DataLoader {
  constructor(loadBatch) {
    this.loadBatch = loadBatch;
    this.queue = [];
    this.timerPromise = null;
  }

  load(id) {
    console.log('load', id);
    this.queue.push(id);
    return new Promise((resolve) => {
      if (!this.timerPromise) {
        this.timerPromise = new Promise((resolve) => {
          setTimeout(async () => {
            this.timerPromise = null;
            const queue = this.queue;
            this.queue = [];
            const result = await this.loadBatch(queue);

            resolve(result);
          }, 200);
        });
      }

      this.timerPromise.then((result) => {
        const item = result.find((item) => item.id === id);
        resolve(item);
      });
    });
  }
}
