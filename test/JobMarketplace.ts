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
});
