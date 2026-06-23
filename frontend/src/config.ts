import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http } from "wagmi";

export const config = getDefaultConfig({
  appName: "Job Marketplace",
  projectId: "30f53ad2af64280e9b33ff154d765b19",
  chains: [sepolia],
  transports: {
    [sepolia.id]: http("https://eth-sepolia.g.alchemy.com/v2/8s6GzqKhThoCdcij0MrH0"),
  },
});

export const MARKETPLACE_ADDRESS = "0x1ec831fe1004161Dc0F862243388BECbE2eD4ECa" as `0x${string}`;
export const TOKEN_ADDRESS = "0x4d979a59b3443395e1179be7921C3B220b1FDae3" as `0x${string}`;
export const MULTISIG_ADDRESS = "0x1d87a2461042B2af06e0Aa433DF499ef6E56908A" as `0x${string}`;
