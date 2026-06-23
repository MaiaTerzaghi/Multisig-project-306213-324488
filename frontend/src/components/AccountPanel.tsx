import { useAccount, useBalance, useBlockNumber } from "wagmi";
import TokenBalance from "./TokenBalance";
import { TOKEN_ADDRESS } from "../config";

const LINK_SEPOLIA = "0x779877A7B0D9E8603169DdbD7836e478b4624789" as `0x${string}`;

function AccountPanel() {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: blockNumber } = useBlockNumber({ watch: true });

  if (!address) return null;

  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="account-panel">
      <div className="account-info">
        <span className="address">{shortAddr}</span>
        <span className="eth-balance">
          {balance
            ? `${parseFloat(balance.formatted).toFixed(4)} ETH`
            : "..."}
        </span>
        <span className="block-number">
          Bloque: {blockNumber?.toString() ?? "..."}
        </span>
      </div>
      <div className="token-balances">
        <TokenBalance tokenAddress={TOKEN_ADDRESS} userAddress={address} />
        <TokenBalance tokenAddress={LINK_SEPOLIA} userAddress={address} />
      </div>
    </div>
  );
}

export default AccountPanel;
