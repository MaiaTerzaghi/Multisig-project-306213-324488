import { useAccount, useBalance, useBlockNumber, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import TokenBalance from "./TokenBalance";
import { TOKEN_ADDRESS } from "../config";

const LINK_SEPOLIA = "0x779877A7B0D9E8603169DdbD7836e478b4624789" as `0x${string}`;

const MINT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

function AccountPanel() {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { writeContract, data: mintHash, isPending: isMinting } = useWriteContract();
  const { isLoading: isConfirmingMint, isSuccess: mintSuccess } =
    useWaitForTransactionReceipt({ hash: mintHash });

  if (!address) return null;

  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleMint = () => {
    writeContract({
      address: TOKEN_ADDRESS,
      abi: MINT_ABI,
      functionName: "mint",
      args: [address, parseEther("1000")],
    });
  };

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
        <button
          onClick={handleMint}
          disabled={isMinting || isConfirmingMint}
          className="btn btn-execute"
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          {isMinting ? "Confirma..." : isConfirmingMint ? "Minteando..." : mintSuccess ? "Listo!" : "Mint 1000 mUSD"}
        </button>
      </div>
    </div>
  );
}

export default AccountPanel;
