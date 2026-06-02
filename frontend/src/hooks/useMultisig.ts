import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import MultisigABI from "../abi/Multisig.json";

// ====== CAMBIAR ESTA DIRECCIÓN DESPUÉS DEL DEPLOY ======
const CONTRACT_ADDRESS = "0x_PONER_DIRECCION_DEL_CONTRATO_DESPLEGADO";
// =========================================================

// Tipo para una propuesta
export interface Proposal {
  id: number;
  destination: string;
  value: bigint;
  data: string;
  approvalCount: number;
  executed: boolean;
  cancelled: boolean;
  proposer: string;
}

// Tipo para el estado del hook
interface MultisigState {
  // Datos del contrato
  signers: string[];
  threshold: number;
  proposals: Proposal[];
  contractAddress: string;

  // Estado del usuario
  account: string | null;
  isSigner: boolean;
  isConnected: boolean;
  isCorrectNetwork: boolean;

  // Estado de la UI
  loading: boolean;
  error: string | null;
  successMsg: string | null;
}

// ID de la red Sepolia
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 en hex

export function useMultisig() {
  const [state, setState] = useState<MultisigState>({
    signers: [],
    threshold: 0,
    proposals: [],
    contractAddress: CONTRACT_ADDRESS,
    account: null,
    isSigner: false,
    isConnected: false,
    isCorrectNetwork: false,
    loading: false,
    error: null,
    successMsg: null,
  });

  // Obtener provider y signer de MetaMask
  const getProviderAndSigner = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask no está instalado");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return { provider, signer };
  }, []);

  // Obtener instancia del contrato (solo lectura)
  const getReadContract = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask no está instalado");
    const provider = new ethers.BrowserProvider(window.ethereum);
    return new ethers.Contract(CONTRACT_ADDRESS, MultisigABI, provider);
  }, []);

  // Obtener instancia del contrato (lectura y escritura)
  const getWriteContract = useCallback(async () => {
    const { signer } = await getProviderAndSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, MultisigABI, signer);
  }, [getProviderAndSigner]);

  // Verificar si estamos en Sepolia
  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return false;
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    return chainId === SEPOLIA_CHAIN_ID;
  }, []);

  // Cargar datos del contrato
  const loadContractData = useCallback(async () => {
    try {
      const contract = await getReadContract();

      const signers = await contract.getSigners();
      const threshold = await contract.threshold();
      const proposalCount = await contract.getProposalCount();

      // Cargar todas las propuestas
      const proposals: Proposal[] = [];
      for (let i = 0; i < Number(proposalCount); i++) {
        const p = await contract.getProposal(i);
        proposals.push({
          id: i,
          destination: p.destination,
          value: p.value,
          data: p.data,
          approvalCount: Number(p.approvalCount),
          executed: p.executed,
          cancelled: p.cancelled,
          proposer: p.proposer,
        });
      }

      // Verificar si el usuario conectado es signer
      let userIsSigner = false;
      if (state.account) {
        userIsSigner = await contract.isSigner(state.account);
      }

      setState((prev) => ({
        ...prev,
        signers: [...signers],
        threshold: Number(threshold),
        proposals,
        isSigner: userIsSigner,
        error: null,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error cargando datos del contrato";
      setState((prev) => ({ ...prev, error: message }));
    }
  }, [getReadContract, state.account]);

  // Conectar wallet
  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        setState((prev) => ({ ...prev, error: "Instalá MetaMask para continuar" }));
        return;
      }

      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const isCorrectNetwork = await checkNetwork();

      if (!isCorrectNetwork) {
        // Pedir cambio a Sepolia
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch {
          setState((prev) => ({
            ...prev,
            error: "Cambiá la red a Sepolia en MetaMask",
          }));
          return;
        }
      }

      setState((prev) => ({
        ...prev,
        account: accounts[0],
        isConnected: true,
        isCorrectNetwork: true,
        error: null,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error conectando wallet";
      setState((prev) => ({ ...prev, error: message }));
    }
  }, [checkNetwork]);

  // Proponer una transacción
  const propose = useCallback(
    async (to: string, valueInEth: string, data: string) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null, successMsg: null }));
        const contract = await getWriteContract();
        const valueInWei = ethers.parseEther(valueInEth);
        const tx = await contract.propose(to, valueInWei, data || "0x");
        await tx.wait();
        setState((prev) => ({ ...prev, loading: false, successMsg: "Propuesta creada" }));
        await loadContractData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al proponer";
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    },
    [getWriteContract, loadContractData]
  );

  // Aprobar una propuesta
  const approveProposal = useCallback(
    async (proposalId: number) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null, successMsg: null }));
        const contract = await getWriteContract();
        const tx = await contract.approve(proposalId);
        await tx.wait();
        setState((prev) => ({ ...prev, loading: false, successMsg: "Propuesta aprobada" }));
        await loadContractData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al aprobar";
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    },
    [getWriteContract, loadContractData]
  );

  // Ejecutar una propuesta
  const executeProposal = useCallback(
    async (proposalId: number) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null, successMsg: null }));
        const contract = await getWriteContract();
        const tx = await contract.execute(proposalId);
        await tx.wait();
        setState((prev) => ({ ...prev, loading: false, successMsg: "Propuesta ejecutada" }));
        await loadContractData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al ejecutar";
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    },
    [getWriteContract, loadContractData]
  );

  // Cancelar una propuesta
  const cancelProposal = useCallback(
    async (proposalId: number) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null, successMsg: null }));
        const contract = await getWriteContract();
        const tx = await contract.cancel(proposalId);
        await tx.wait();
        setState((prev) => ({ ...prev, loading: false, successMsg: "Propuesta cancelada" }));
        await loadContractData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al cancelar";
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    },
    [getWriteContract, loadContractData]
  );

  // Verificar si el usuario ya aprobó una propuesta
  const hasUserApproved = useCallback(
    async (proposalId: number): Promise<boolean> => {
      if (!state.account) return false;
      try {
        const contract = await getReadContract();
        return await contract.hasApproved(proposalId, state.account);
      } catch {
        return false;
      }
    },
    [state.account, getReadContract]
  );

  // Escuchar cambios de cuenta en MetaMask
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState((prev) => ({ ...prev, account: null, isConnected: false, isSigner: false }));
      } else {
        setState((prev) => ({ ...prev, account: accounts[0] }));
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // Cargar datos cuando cambia la cuenta
  useEffect(() => {
    if (state.isConnected && state.account) {
      loadContractData();
    }
  }, [state.isConnected, state.account, loadContractData]);

  return {
    ...state,
    connectWallet,
    propose,
    approveProposal,
    executeProposal,
    cancelProposal,
    hasUserApproved,
    loadContractData,
  };
}
