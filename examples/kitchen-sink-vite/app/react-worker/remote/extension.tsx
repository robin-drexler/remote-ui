import {RemoteApp} from './app';

self.addExtension(
  (api) => {
    return <RemoteApp {...api}></RemoteApp>;
  },
  (standardApi) => {
    return {
      dataLoaders: {
        orders: async (ids) => {
          // fake api call
          await fetch('https://httpbin.org/delay/1');

          return ids.map((id) => {
            return {
              id,
              value: `value-${id}`,
            };
          });
        },
      },
    };
  },
);

export default {};

async function wait(ms = 1000) {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, ms);
  });
}
