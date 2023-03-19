import {useState, useEffect} from 'react';

const Button = 'Button' as any;

export function RemoteApp({
  getMessage,
  index,
  dataLoaders,
}: {
  getMessage: () => Promise<string>;
  index: number;
}) {
  const [message, setMessage] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    async function run() {
      if (index === 2) {
        await wait(1000);
      }
      const result = await dataLoaders.orders.load(index);

      setData({data: {index: result.value}});
    }
    run();
  }, []);

  return (
    <>
      {message && `Message: ${message}`}
      <Button
        onPress={async () => {
          const message = await getMessage();
          setMessage(message);
          console.log(`Message from the host: ${message}`);
        }}
      >
        {!data ? 'Loading...' : `${data.data.index}`}
      </Button>
    </>
  );
}

async function wait(ms = 1000) {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, ms);
  });
}
