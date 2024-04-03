import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

export function Home() {
  return (<div id="home">
    <Helmet>
      <title>Circuitscan - Home</title>
    </Helmet>
    <h3 className="text-xl p-6 pb-0">Example circuits</h3>
    <ul className="p-6 pl-9 list-disc">
      <li><Link to="/address/0xda66ad5da2619054d890c359cb22601b104ac662">multiplier(3) groth16</Link></li>
      <li><Link to="/address/0xf6359f2f29044b308518529776b906fc47060729">multiplier(3) fflonk exact match</Link></li>
      <li><Link to="/address/0xb4ebB5B4fA32D0d5BD6e2E905cb6603Bf9b7E457">multiplier(3) plonk whitespace,  hardhat import missing</Link></li>
      <li><Link to="/address/0x76e83a791975fba6b86fbb44221857def11ff6bb">multiplier(3) plonk whitespace,  hardhat import missing, different contract name</Link></li>
      <li><Link to="/address/0x776Da74251Ea5f609354feE4F40C71fEc1a54926">lessthan(4) plonk whitespace,  hardhat import missing</Link></li>
    </ul>
  </div>);
}
