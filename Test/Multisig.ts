import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Multisig", function () {
  // Helper: despliega el contrato con signers y threshold dados
  async function deployMultisig(signerAddresses: string[], threshold: number) {
    const [deployer] = await ethers.getSigners();
    const Multisig = await ethers.getContractFactory("Multisig");
    const multisig = await Multisig.deploy(signerAddresses, threshold);
    return multisig;
  }

  // ==================== Deploy ====================
  describe("Deploy", function () {
    it("Guarda signers y threshold correctamente", async function () {
      const [s1, s2, s3] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address, s3.address], 2);

      const signers = await multisig.getSigners();
      expect(signers).to.deep.equal([s1.address, s2.address, s3.address]);
      expect(await multisig.threshold()).to.equal(2n);
    });

    it("Revierte si no hay signers", async function () {
      await expect(deployMultisig([], 1)).to.be.revertedWith("Debe haber al menos un signer");
    });

    it("Revierte si threshold es 0", async function () {
      const [s1] = await ethers.getSigners();
      await expect(deployMultisig([s1.address], 0)).to.be.revertedWith("Threshold debe ser mayor a 0");
    });

    it("Revierte si threshold supera cantidad de signers", async function () {
      const [s1, s2] = await ethers.getSigners();
      await expect(deployMultisig([s1.address, s2.address], 3)).to.be.revertedWith(
        "Threshold no puede superar cantidad de signers"
      );
    });

    it("Revierte si hay signers duplicados", async function () {
      const [s1] = await ethers.getSigners();
      await expect(deployMultisig([s1.address, s1.address], 1)).to.be.revertedWith("Signer duplicado");
    });

    it("Revierte si un signer es address(0)", async function () {
      const [s1] = await ethers.getSigners();
      await expect(
        deployMultisig([s1.address, ethers.ZeroAddress], 1)
      ).to.be.revertedWith("Signer no puede ser address(0)");
    });
  });

  // ==================== Propose ====================
  describe("Propose", function () {
    it("Signer puede proponer y emite evento", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await expect(multisig.connect(s1).propose(s2.address, 0, "0x"))
        .to.emit(multisig, "ProposalCreated")
        .withArgs(0n, s1.address, s2.address, 0n);

      expect(await multisig.getProposalCount()).to.equal(1n);
    });

    it("No-signer no puede proponer", async function () {
      const [s1, s2, outsider] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await expect(
        multisig.connect(outsider).propose(s1.address, 0, "0x")
      ).to.be.revertedWith("No eres signer");
    });
  });

  // ==================== Approve ====================
  describe("Approve", function () {
    it("Signer puede aprobar una propuesta pendiente", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");

      await expect(multisig.connect(s1).approve(0))
        .to.emit(multisig, "ProposalApproved")
        .withArgs(0n, s1.address);

      const proposal = await multisig.getProposal(0);
      expect(proposal.approvalCount).to.equal(1n);
    });

    it("No-signer no puede aprobar", async function () {
      const [s1, s2, outsider] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");

      await expect(
        multisig.connect(outsider).approve(0)
      ).to.be.revertedWith("No eres signer");
    });

    it("No puede aprobar dos veces la misma propuesta", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");
      await multisig.connect(s1).approve(0);

      await expect(
        multisig.connect(s1).approve(0)
      ).to.be.revertedWith("Ya aprobaste esta propuesta");
    });

    it("No puede aprobar una propuesta cancelada", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");
      await multisig.connect(s1).cancel(0);

      await expect(
        multisig.connect(s2).approve(0)
      ).to.be.revertedWith("Propuesta cancelada");
    });
  });

  // ==================== Execute ====================
  describe("Execute", function () {
    it("Se ejecuta cuando alcanza el threshold", async function () {
      const [s1, s2, receiver] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      // Enviar ETH al contrato para que tenga fondos
      await s1.sendTransaction({ to: await multisig.getAddress(), value: ethers.parseEther("1.0") });

      // Proponer enviar 0.5 ETH al receiver
      await multisig.connect(s1).propose(receiver.address, ethers.parseEther("0.5"), "0x");

      // Ambos signers aprueban
      await multisig.connect(s1).approve(0);
      await multisig.connect(s2).approve(0);

      const balanceBefore = await ethers.provider.getBalance(receiver.address);

      // Ejecutar
      await expect(multisig.connect(s1).execute(0))
        .to.emit(multisig, "ProposalExecuted")
        .withArgs(0n, s1.address);

      const balanceAfter = await ethers.provider.getBalance(receiver.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.5"));

      // Verificar que quedó marcada como ejecutada
      const proposal = await multisig.getProposal(0);
      expect(proposal.executed).to.be.true;
    });

    it("No se puede ejecutar sin suficientes aprobaciones", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");
      await multisig.connect(s1).approve(0); // Solo 1 de 2

      await expect(
        multisig.connect(s1).execute(0)
      ).to.be.revertedWith("No hay suficientes aprobaciones");
    });

    it("No se puede ejecutar dos veces", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");
      await multisig.connect(s1).approve(0);
      await multisig.connect(s2).approve(0);
      await multisig.connect(s1).execute(0);

      await expect(
        multisig.connect(s1).execute(0)
      ).to.be.revertedWith("Propuesta ya ejecutada");
    });

    it("No-signer no puede ejecutar", async function () {
      const [s1, s2, outsider] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");
      await multisig.connect(s1).approve(0);
      await multisig.connect(s2).approve(0);

      await expect(
        multisig.connect(outsider).execute(0)
      ).to.be.revertedWith("No eres signer");
    });
  });

  // ==================== Cancel ====================
  describe("Cancel", function () {
    it("El proponente puede cancelar su propuesta", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");

      await expect(multisig.connect(s1).cancel(0))
        .to.emit(multisig, "ProposalCancelled")
        .withArgs(0n);

      const proposal = await multisig.getProposal(0);
      expect(proposal.cancelled).to.be.true;
    });

    it("Otro signer no puede cancelar una propuesta ajena", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");

      await expect(
        multisig.connect(s2).cancel(0)
      ).to.be.revertedWith("Solo el proponente puede cancelar");
    });

    it("No se puede cancelar una propuesta ya ejecutada", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");
      await multisig.connect(s1).approve(0);
      await multisig.connect(s2).approve(0);
      await multisig.connect(s1).execute(0);

      await expect(
        multisig.connect(s1).cancel(0)
      ).to.be.revertedWith("Propuesta ya ejecutada");
    });

    it("No se puede ejecutar una propuesta cancelada", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      await multisig.connect(s1).propose(s2.address, 0, "0x");
      await multisig.connect(s1).approve(0);
      await multisig.connect(s2).approve(0);
      await multisig.connect(s1).cancel(0);

      await expect(
        multisig.connect(s1).execute(0)
      ).to.be.revertedWith("Propuesta cancelada");
    });
  });

  // ==================== Reentrancy ====================
  describe("Reentrancy", function () {
    it("El patrón Checks-Effects-Interactions previene reentrancy", async function () {
      const [s1, s2] = await ethers.getSigners();
      const multisig = await deployMultisig([s1.address, s2.address], 2);

      // Después de ejecutar, la propuesta queda marcada como executed=true
      // antes de la llamada externa, por lo que un reentrant call a execute
      // fallaría con "Propuesta ya ejecutada"
      await multisig.connect(s1).propose(s2.address, 0, "0x");
      await multisig.connect(s1).approve(0);
      await multisig.connect(s2).approve(0);
      await multisig.connect(s1).execute(0);

      // Verificar que está ejecutada y no se puede volver a ejecutar
      const proposal = await multisig.getProposal(0);
      expect(proposal.executed).to.be.true;

      await expect(
        multisig.connect(s1).execute(0)
      ).to.be.revertedWith("Propuesta ya ejecutada");
    });
  });
});