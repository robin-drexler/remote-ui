/** @jsxRuntime automatic */
/** @jsxImportSource react */

import {useEffect, useState} from 'react';
import {Button, Modal, Stack, Text} from './components';

export function App() {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCounter(counter + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [counter]);

  return (
    <Stack>
      <Button
        onPress={() => setCounter(counter + 1)}
        modal={counter === 0 ? <Modal>Hello</Modal> : undefined}
      >
        Update counter
      </Button>
      <Text>Counter: {counter}</Text>
    </Stack>
  );
}
