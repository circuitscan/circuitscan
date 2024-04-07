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
      <li><Link to="/address/0x0E3f0713C4636e29BEDc750F5b8e84Ef02969BeA">multiplier(2) groth16 with pubs on holesky</Link></li>
      <li><Link to="/address/0x28A732B3d80Fc1784274Fc15b36de73776466d78">multiplier(2) groth16 with pubs on sepolia</Link></li>
      <li><Link to="/address/0xf6359f2f29044b308518529776b906fc47060729">multiplier(3) fflonk exact match</Link></li>
      <li><Link to="/address/0xb4ebB5B4fA32D0d5BD6e2E905cb6603Bf9b7E457">multiplier(3) plonk whitespace,  hardhat import missing</Link></li>
      <li><Link to="/address/0x76e83a791975fba6b86fbb44221857def11ff6bb">multiplier(3) plonk whitespace,  hardhat import missing, different contract name</Link></li>
      <li><Link to="/address/0x776Da74251Ea5f609354feE4F40C71fEc1a54926">lessthan(4) plonk whitespace,  hardhat import missing</Link></li>
    </ul>
    <p className="p-6">
      <a href="https://github.com/numtel/circuitscan" target="_blank" rel="noopener">
        View Github Repo
      </a>
    </p>
    <h3 className="text-xl p-6 pb-0">Why do Groth16 circuits always mismatch <code>delta&#123;x|y&#125;&#123;1|2&#125;</code> values?</h3>
    <p className="p-6">
      These values correspond to the entropy used during compilation. This process does not attempt to recreate these settings.
    </p>
  </div>);
}
