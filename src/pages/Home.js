import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';


export function Home() {
  return (<div id="home">
    <Helmet>
      <title>Circuitscan - Home</title>
    </Helmet>
    <p className="text-3xl font-bold underline">Hello, world</p>
  </div>);
}
