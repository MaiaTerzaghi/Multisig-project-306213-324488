import { useReadContract } from "wagmi";
import { formatUnits } from "viem";

const ERC20_ABI = [
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

interface Props {
  tokenAddress: `0x${string}`;
  userAddress: `0x${string}`;
}

function TokenBalance({ tokenAddress, userAddress }: Props) {
  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "name",
  });

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  const { data: rawBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress],
  });

  const formatted =
    rawBalance !== undefined && decimals !== undefined
      ? parseFloat(formatUnits(rawBalance, decimals)).toFixed(4)
      : "...";

  return (
    <div className="token-balance">
      <span className="token-name">
        {name ?? "..."} ({symbol ?? "..."})
      </span>
      <span className="token-amount">{formatted}</span>
    </div>
  );
}

export default TokenBalance;
