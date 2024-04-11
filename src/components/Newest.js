import useFetchJson from './useFetchJson.js';
import Card from './Card.js';

export default function Newest() {
  const {data, loading, error, setData} = useFetchJson(
    import.meta.env.VITE_API_URL,
    {
      payload: {
        action: 'newest',
      },
    },
  );
  if(data) {
    console.log(data);
  }

  return (<>
    {loading ? <>
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p className="p-6">Loading newest submissions...</p>
        </div>
      </Card>
    </> : error ? <>
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p className="p-6">Error loading newest submissions!</p>
        </div>
      </Card>
    </> : data ? <>
      <Card>
          <p className="p-6">Newest submissions</p>
      </Card>
    </> : null}
  </>);
}
