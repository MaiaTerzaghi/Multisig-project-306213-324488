import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("JobMarketplace", function () {

  async function deployFixture() {
    const [deployer, client, provider, evaluator, outsider] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockToken");
    const token = await Token.deploy();

    const Marketplace = await ethers.getContractFactory("JobMarketplace");
    const marketplace = await Marketplace.deploy(await token.getAddress());

    const budget = ethers.parseEther("100");
    await token.mint(client.address, ethers.parseEther("10000"));

    const futureTime = Math.floor(Date.now() / 1000) + 86400;

    return { deployer, client, provider, evaluator, outsider, token, marketplace, budget, futureTime };
  }

  // ==================== Happy Path ====================
  describe("Happy path: crear → fondear → entregar → completar", function () {
    it("Flujo completo exitoso", async function () {
      const { client, provider, evaluator, token, marketplace, budget, futureTime } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      await marketplace.connect(client).createJob("Diseño de logo", budget, evaluator.address, provider.address, futureTime);

      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);

      const deliverable = ethers.id("ipfs://QmHash123");
      await marketplace.connect(provider).submit(0, deliverable);

      const reason = ethers.id("Trabajo aprobado");
      await marketplace.connect(evaluator).complete(0, reason);

      const job = await marketplace.getJob(0);
      expect(job.status).to.equal(3n); // Completed

      expect(await token.balanceOf(provider.address)).to.equal(budget);
    });
  });

  // ==================== Rechazos ====================
  describe("Rechazos", function () {
    it("Cliente rechaza en Open", async function () {
      const { client, provider, evaluator, marketplace, budget, futureTime } = await deployFixture();

      await marketplace.connect(client).createJob("Job test", budget, evaluator.address, provider.address, futureTime);

      const reason = ethers.id("No lo necesito mas");
      await expect(marketplace.connect(client).reject(0, reason))
        .to.emit(marketplace, "JobRejected")
        .withArgs(0n, client.address, reason);

      const job = await marketplace.getJob(0);
      expect(job.status).to.equal(4n); // Rejected
    });

    it("Evaluador rechaza en Funded", async function () {
      const { client, provider, evaluator, token, marketplace, budget, futureTime } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      await marketplace.connect(client).createJob("Job test", budget, evaluator.address, provider.address, futureTime);
      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);

      const balanceBefore = await token.balanceOf(client.address);
      const reason = ethers.id("No cumple requisitos");
      await marketplace.connect(evaluator).reject(0, reason);

      const balanceAfter = await token.balanceOf(client.address);
      expect(balanceAfter - balanceBefore).to.equal(budget);

      const job = await marketplace.getJob(0);
      expect(job.status).to.equal(4n); // Rejected
    });

    it("Evaluador rechaza en Submitted", async function () {
      const { client, provider, evaluator, token, marketplace, budget, futureTime } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      await marketplace.connect(client).createJob("Job test", budget, evaluator.address, provider.address, futureTime);
      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);
      await marketplace.connect(provider).submit(0, ethers.id("entrega"));

      const balanceBefore = await token.balanceOf(client.address);
      await marketplace.connect(evaluator).reject(0, ethers.id("Entrega insuficiente"));

      const balanceAfter = await token.balanceOf(client.address);
      expect(balanceAfter - balanceBefore).to.equal(budget);
    });
  });

  // ==================== Expiracion ====================
  describe("Expiracion", function () {
    it("claimRefund funciona desde Funded", async function () {
      const { client, provider, evaluator, token, marketplace, budget } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      const shortExpiry = Math.floor(Date.now() / 1000) + 60;
      await marketplace.connect(client).createJob("Job corto", budget, evaluator.address, provider.address, shortExpiry);
      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);

      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine", []);

      const balanceBefore = await token.balanceOf(client.address);
      await marketplace.connect(client).claimRefund(0);

      const balanceAfter = await token.balanceOf(client.address);
      expect(balanceAfter - balanceBefore).to.equal(budget);

      const job = await marketplace.getJob(0);
      expect(job.status).to.equal(5n); // Expired
    });

    it("claimRefund funciona desde Submitted", async function () {
      const { client, provider, evaluator, token, marketplace, budget } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      const latestBlock = await ethers.provider.getBlock("latest");
      const shortExpiry = (latestBlock?.timestamp ?? Math.floor(Date.now() / 1000)) + 60;
      await marketplace.connect(client).createJob("Job corto", budget, evaluator.address, provider.address, shortExpiry);
      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);
      await marketplace.connect(provider).submit(0, ethers.id("entrega"));

      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine", []);

      const balanceBefore = await token.balanceOf(client.address);
      await marketplace.connect(client).claimRefund(0);

      const balanceAfter = await token.balanceOf(client.address);
      expect(balanceAfter - balanceBefore).to.equal(budget);
    });

    it("claimRefund revierte si no expiro", async function () {
      const { client, provider, evaluator, token, marketplace, budget, futureTime } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      await marketplace.connect(client).createJob("Job", budget, evaluator.address, provider.address, futureTime);
      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);

      await expect(
        marketplace.connect(client).claimRefund(0)
      ).to.be.revertedWithCustomError(marketplace, "NotExpired");
    });

    it("Cualquiera puede llamar claimRefund", async function () {
      const { client, provider, evaluator, outsider, token, marketplace, budget } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      const latestBlock = await ethers.provider.getBlock("latest");
      const shortExpiry = (latestBlock?.timestamp ?? Math.floor(Date.now() / 1000)) + 60;
      await marketplace.connect(client).createJob("Job", budget, evaluator.address, provider.address, shortExpiry);
      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);

      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine", []);

      await marketplace.connect(outsider).claimRefund(0);

      const job = await marketplace.getJob(0);
      expect(job.status).to.equal(5n); // Expired
    });
  });

  // ==================== Control de acceso ====================
  describe("Control de acceso", function () {
    it("Solo el cliente puede fondear", async function () {
      const { client, provider, evaluator, outsider, marketplace, budget, futureTime } = await deployFixture();

      await marketplace.connect(client).createJob("Job", budget, evaluator.address, provider.address, futureTime);

      await expect(
        marketplace.connect(outsider).fund(0)
      ).to.be.revertedWithCustomError(marketplace, "Unauthorized");
    });

    it("Solo el cliente puede setProvider", async function () {
      const { client, provider, evaluator, outsider, marketplace, budget, futureTime } = await deployFixture();

      await marketplace.connect(client).createJob("Job", budget, evaluator.address, ethers.ZeroAddress, futureTime);

      await expect(
        marketplace.connect(outsider).setProvider(0, provider.address)
      ).to.be.revertedWithCustomError(marketplace, "Unauthorized");
    });

    it("Solo el proveedor puede hacer submit", async function () {
      const { client, provider, evaluator, outsider, token, marketplace, budget, futureTime } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      await marketplace.connect(client).createJob("Job", budget, evaluator.address, provider.address, futureTime);
      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);

      await expect(
        marketplace.connect(outsider).submit(0, ethers.id("test"))
      ).to.be.revertedWithCustomError(marketplace, "Unauthorized");
    });

    it("Solo el evaluador puede completar", async function () {
      const { client, provider, evaluator, outsider, token, marketplace, budget, futureTime } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      await marketplace.connect(client).createJob("Job", budget, evaluator.address, provider.address, futureTime);
      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);
      await marketplace.connect(provider).submit(0, ethers.id("entrega"));

      await expect(
        marketplace.connect(client).complete(0, ethers.id("ok"))
      ).to.be.revertedWithCustomError(marketplace, "Unauthorized");
    });

    it("En Open solo el cliente puede rechazar", async function () {
      const { client, provider, evaluator, outsider, marketplace, budget, futureTime } = await deployFixture();

      await marketplace.connect(client).createJob("Job", budget, evaluator.address, provider.address, futureTime);

      await expect(
        marketplace.connect(outsider).reject(0, ethers.id("razon"))
      ).to.be.revertedWithCustomError(marketplace, "Unauthorized");
    });

    it("En Funded solo el evaluador puede rechazar", async function () {
      const { client, provider, evaluator, token, marketplace, budget, futureTime } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      await marketplace.connect(client).createJob("Job", budget, evaluator.address, provider.address, futureTime);
      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);

      await expect(
        marketplace.connect(client).reject(0, ethers.id("razon"))
      ).to.be.revertedWithCustomError(marketplace, "Unauthorized");
    });

    it("No se puede fondear sin proveedor asignado", async function () {
      const { client, evaluator, token, marketplace, budget, futureTime } = await deployFixture();
      const marketplaceAddr = await marketplace.getAddress();

      await marketplace.connect(client).createJob("Job", budget, evaluator.address, ethers.ZeroAddress, futureTime);
      await token.connect(client).approve(marketplaceAddr, budget);

      await expect(
        marketplace.connect(client).fund(0)
      ).to.be.revertedWithCustomError(marketplace, "ProviderNotSet");
    });

    it("No se puede asignar proveedor si ya tiene uno", async function () {
      const { client, provider, evaluator, outsider, marketplace, budget, futureTime } = await deployFixture();

      await marketplace.connect(client).createJob("Job", budget, evaluator.address, provider.address, futureTime);

      await expect(
        marketplace.connect(client).setProvider(0, outsider.address)
      ).to.be.revertedWithCustomError(marketplace, "ProviderAlreadySet");
    });
  });

  // ==================== Multisig como evaluador ====================
  describe("Multisig como evaluador", function () {
    it("complete solo funciona tras alcanzar el threshold del Multisig", async function () {
      const [deployer, client, provider, signer1, signer2] = await ethers.getSigners();

      const Token = await ethers.getContractFactory("MockToken");
      const token = await Token.deploy();

      const Multisig = await ethers.getContractFactory("Multisig");
      const multisig = await Multisig.deploy([signer1.address, signer2.address], 2);
      const multisigAddr = await multisig.getAddress();

      const Marketplace = await ethers.getContractFactory("JobMarketplace");
      const marketplace = await Marketplace.deploy(await token.getAddress());
      const marketplaceAddr = await marketplace.getAddress();

      const budget = ethers.parseEther("100");
      await token.mint(client.address, budget);

      const futureTime = Math.floor(Date.now() / 1000) + 86400;
      await marketplace.connect(client).createJob(
        "Job con Multisig evaluador",
        budget,
        multisigAddr,
        provider.address,
        futureTime
      );

      await token.connect(client).approve(marketplaceAddr, budget);
      await marketplace.connect(client).fund(0);

      const deliverable = ethers.id("entrega final");
      await marketplace.connect(provider).submit(0, deliverable);

      // Un signer individual NO puede completar (no es el evaluador)
      await expect(
        marketplace.connect(signer1).complete(0, ethers.id("ok"))
      ).to.be.revertedWithCustomError(marketplace, "Unauthorized");

      // Crear propuesta en el Multisig para llamar a complete
      const completeData = marketplace.interface.encodeFunctionData("complete", [
        0,
        ethers.id("Aprobado por consenso")
      ]);

      await multisig.connect(signer1).propose(marketplaceAddr, 0, completeData);

      // Solo un signer aprueba: no alcanza el threshold
      await multisig.connect(signer1).approve(0);

      // Intentar ejecutar sin threshold → revierte
      await expect(
        multisig.connect(signer1).execute(0)
      ).to.be.revertedWith("No hay suficientes aprobaciones");

      // Segundo signer aprueba → alcanza threshold
      await multisig.connect(signer2).approve(0);

      // Ahora si se puede ejecutar
      await multisig.connect(signer1).execute(0);

      // Verificar que el job esta Completed
      const job = await marketplace.getJob(0);
      expect(job.status).to.equal(3n); // Completed

      // Verificar que el proveedor recibio los tokens
      expect(await token.balanceOf(provider.address)).to.equal(budget);
    });
  });
});
