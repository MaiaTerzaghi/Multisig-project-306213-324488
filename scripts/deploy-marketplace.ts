import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  console.log("Desplegando MockToken...");
  const Token = await ethers.getContractFactory("MockToken");
  const token = await Token.deploy();
  const tokenAddress = await token.getAddress();
  console.log("MockToken desplegado en:", tokenAddress);

  console.log("\nDesplegando JobMarketplace...");
  const Marketplace = await ethers.getContractFactory("JobMarketplace");
  const marketplace = await Marketplace.deploy(tokenAddress);
  const marketplaceAddress = await marketplace.getAddress();
  console.log("JobMarketplace desplegado en:", marketplaceAddress);

  // Mintear tokens a Maia y Pilar para pruebas
  const maiaAddr = "0xE7888BB7685842AE17F95c27494F403B7863Ce6A";
  const pilarAddr = "0xa030aA74b0607DE3F2053d9D20F6992e1b32677f";
  const amount = ethers.parseEther("1000");

  await token.mint(maiaAddr, amount);
  await token.mint(pilarAddr, amount);
  console.log("\nMinteados 1000 mUSD a Maia y Pilar");

  console.log("\n=== GUARDAR ESTAS DIRECCIONES ===");
  console.log("MockToken:", tokenAddress);
  console.log("JobMarketplace:", marketplaceAddress);
  console.log("Multisig (Entrega 2):", "0x1d87a2461042B2af06e0Aa433DF499ef6E56908A");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
