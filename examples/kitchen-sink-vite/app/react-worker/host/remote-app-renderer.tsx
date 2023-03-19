import React, {useMemo, useEffect} from 'react';
import Worker from '../remote/worker?worker';

import {
  createController,
  createRemoteReceiver,
  RemoteRenderer,
} from '@remote-ui/react/host';

import {createEndpoint, fromWebWorker} from '@remote-ui/rpc';

import {Button} from './components';
import {Endpoint} from '../types';

let cachedRemoteEndpoint = null;

export function RemoteAppRenderer({
  inputRef,
  index,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const controller = useMemo(() => createController({Button}), []);
  const receiver = useMemo(() => createRemoteReceiver(), []);

  useEffect(() => {
    async function run() {
      const remoteEndpoint =
        cachedRemoteEndpoint ??
        createEndpoint<Endpoint>(fromWebWorker(new Worker()));

      cachedRemoteEndpoint = remoteEndpoint;

      // await remoteEndpoint.call.render(receiver.receive, {
      //   getMessage: async () => inputRef.current!.value,
      // });

      await remoteEndpoint.call.loadExtension();
      await remoteEndpoint.call.render(
        receiver.receive,
        {
          getMessage: async () => inputRef.current!.value,
        },
        index,
      );
    }
    run();
  }, [receiver]);

  return <RemoteRenderer receiver={receiver} controller={controller} />;
}
