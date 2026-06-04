import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  // Direcciones de los signers
  const signers = [
    "0xE7888BB7685842AE17F95c27494F403B7863Ce6A", // Maia
    "0xa030aA74b0607DE3F2053d9D20F6992e1b32677f", // Pilar
  ];

  const threshold = 2; // Ambas  aprobamos para ejecutar

  console.log("Desplegando Multisig...");
  console.log("Signers:", signers);
  console.log("Threshold:", threshold);

  const Multisig = await ethers.getContractFactory("Multisig");
  const multisig = await Multisig.deploy(signers, threshold);

  const address = await multisig.getAddress();
  console.log("\nMultisig desplegado en:", address);
  console.log("\nGuardá esta dirección para el frontend y el README.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});