import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';


export function Home() {
  return (<div id="home">
    <Helmet>
      <title>Circuitscan - Home</title>
    </Helmet>
    <div className="p-6">
      <p><Link to="/address/0xf6359f2f29044b308518529776b906fc47060729">multiplier(3) fflonk exact match</Link></p>
    </div>
  </div>);
}
