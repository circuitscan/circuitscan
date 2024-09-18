
// Convert output from snarkjs-groth16-multi-verifier to match deployed verifier contract
export default function transformSource(input) {
  return input
    .replace('contract Groth16MultiVerifier {',
      `import {MAX_DEPTH} from "./Constants.sol";

contract SemaphoreVerifier {`)
    .replaceAll('verifierIndex', 'merkleTreeDepth')
    .replace('uint256[14][32] VK_POINTS', 'uint256[14][MAX_DEPTH] VK_POINTS')
    .replace(`g1_mulAccC(
                    _pVk,
                    mload(add(vkPoints, 192)),
                    mload(add(vkPoints, 224)),
                    calldataload(add(pubSignals, 0))
                )`,
     'g1_mulAccC(_pVk, mload(add(vkPoints, 192)), mload(add(vkPoints, 224)), calldataload(add(pubSignals, 0)))');
}
