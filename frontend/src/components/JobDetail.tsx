import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther, keccak256, toBytes } from "viem";
import { MARKETPLACE_ADDRESS, TOKEN_ADDRESS } from "../config";
import marketplaceAbi from "../abi/JobMarketplace.json";

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

const STATUS_LABELS = [
  "Abierto",
  "Fondeado",
  "Entregado",
  "Completado",
  "Rechazado",
  "Expirado",
];

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

interface JobData {
  client: string;
  provider: string;
  evaluator: string;
  description: string;
  budget: bigint;
  expiresAt: bigint;
  status: number;
  deliverableRef: string;
}

interface Props {
  jobId: number;
  onBack: () => void;
}

function JobDetail({ jobId, onBack }: Props) {
  const { address } = useAccount();

  const { data, refetch } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: marketplaceAbi,
    functionName: "getJob",
    args: [BigInt(jobId)],
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? ZERO_ADDR as `0x${string}`, MARKETPLACE_ADDRESS],
  });

  const {
    writeContract,
    data: txHash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  const [providerInput, setProviderInput] = useState("");
  const [deliverableInput, setDeliverableInput] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isSuccess) {
      setSuccessMsg("Transaccion confirmada");
      refetch();
      refetchAllowance();
      const timer = setTimeout(() => {
        setSuccessMsg("");
        reset();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, refetch, refetchAllowance, reset]);

  if (!data) return <p className="loading">Cargando...</p>;

  const job = data as unknown as JobData;
  const status = Number(job.status);
  const isClient = address?.toLowerCase() === job.client.toLowerCase();
  const isProvider = address?.toLowerCase() === job.provider.toLowerCase();
  const isEvaluator = address?.toLowerCase() === job.evaluator.toLowerCase();
  const hasProvider = job.provider !== ZERO_ADDR;
  const isExpired = Date.now() / 1000 > Number(job.expiresAt);
  const hasAllowance =
    allowance !== undefined && allowance >= job.budget;

  const handleApproveToken = () => {
    writeContract({
      address: TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [MARKETPLACE_ADDRESS, job.budget],
    });
  };

  const handleFund = () => {
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi as readonly unknown[],
      functionName: "fund",
      args: [BigInt(jobId)],
    });
  };

  const handleSetProvider = () => {
    if (!providerInput) return;
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi as readonly unknown[],
      functionName: "setProvider",
      args: [BigInt(jobId), providerInput as `0x${string}`],
    });
  };

  const handleSubmit = () => {
    if (!deliverableInput) return;
    const hash = keccak256(toBytes(deliverableInput));
    localStorage.setItem(`deliverable-${jobId}`, deliverableInput);
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi as readonly unknown[],
      functionName: "submit",
      args: [BigInt(jobId), hash],
    });
  };

  const handleComplete = () => {
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi as readonly unknown[],
      functionName: "complete",
      args: [BigInt(jobId), keccak256(toBytes("Aprobado"))],
    });
  };

  const handleReject = () => {
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi as readonly unknown[],
      functionName: "reject",
      args: [BigInt(jobId), keccak256(toBytes("Rechazado"))],
    });
  };

  const handleClaimRefund = () => {
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi as readonly unknown[],
      functionName: "claimRefund",
      args: [BigInt(jobId)],
    });
  };

  const deliverableContent = localStorage.getItem(`deliverable-${jobId}`);
  const isTerminal = status >= 3;

  return (
    <div className="job-detail">
      <button onClick={onBack} className="back-btn">
        &larr; Volver
      </button>
      <h2>Trabajo #{jobId}</h2>

      <div className="job-info card">
        <div className="info-row">
          <span className="info-label">Estado: </span>
          {STATUS_LABELS[status]}
        </div>
        <div className="info-row">
          <span className="info-label">Descripcion: </span>
          {job.description}
        </div>
        <div className="info-row">
          <span className="info-label">Budget: </span>
          {formatEther(job.budget)} mUSD
        </div>
        <div className="info-row">
          <span className="info-label">Cliente: </span>
          {job.client}
        </div>
        <div className="info-row">
          <span className="info-label">Proveedor: </span>
          {hasProvider ? job.provider : "Sin asignar"}
        </div>
        <div className="info-row">
          <span className="info-label">Evaluador: </span>
          {job.evaluator}
        </div>
        <div className="info-row">
          <span className="info-label">Expira: </span>
          {new Date(Number(job.expiresAt) * 1000).toLocaleString()}
          {isExpired && !isTerminal && (
            <span className="expired-tag"> (EXPIRADO)</span>
          )}
        </div>
      </div>

      {status >= 2 && (
        <div className="card">
          <span className="info-label">Entrega: </span>
          <p>{deliverableContent ?? "(no disponible en este navegador)"}</p>
        </div>
      )}

      {!isTerminal && (
        <div className="actions">
          {isClient && status === 0 && !hasProvider && (
            <div className="action-group">
              <input
                placeholder="Direccion del proveedor (0x...)"
                value={providerInput}
                onChange={(e) => setProviderInput(e.target.value)}
              />
              <button onClick={handleSetProvider} disabled={isPending || isConfirming}>
                Asignar Proveedor
              </button>
            </div>
          )}

          {isClient && status === 0 && hasProvider && !hasAllowance && (
            <button
              onClick={handleApproveToken}
              disabled={isPending || isConfirming}
              className="btn btn-execute"
            >
              Aprobar Token ({formatEther(job.budget)} mUSD)
            </button>
          )}

          {isClient && status === 0 && hasProvider && hasAllowance && (
            <button
              onClick={handleFund}
              disabled={isPending || isConfirming}
              className="btn btn-execute"
            >
              Fondear Trabajo
            </button>
          )}

          {isClient && status === 0 && (
            <button
              onClick={handleReject}
              disabled={isPending || isConfirming}
              className="btn btn-cancel"
            >
              Rechazar
            </button>
          )}

          {isProvider && status === 1 && (
            <div className="action-group">
              <textarea
                placeholder="Contenido de la entrega..."
                value={deliverableInput}
                onChange={(e) => setDeliverableInput(e.target.value)}
              />
              <button
                onClick={handleSubmit}
                disabled={isPending || isConfirming || !deliverableInput}
                className="btn btn-execute"
              >
                Enviar Entrega
              </button>
            </div>
          )}

          {isEvaluator && status === 2 && (
            <div className="action-group">
              <button
                onClick={handleComplete}
                disabled={isPending || isConfirming}
                className="btn btn-approve"
              >
                Aprobar
              </button>
              <button
                onClick={handleReject}
                disabled={isPending || isConfirming}
                className="btn btn-cancel"
              >
                Rechazar
              </button>
            </div>
          )}

          {isEvaluator && status === 1 && (
            <button
              onClick={handleReject}
              disabled={isPending || isConfirming}
              className="btn btn-cancel"
            >
              Rechazar
            </button>
          )}

          {(status === 1 || status === 2) && isExpired && (
            <button
              onClick={handleClaimRefund}
              disabled={isPending || isConfirming}
              className="btn btn-execute"
            >
              Reclamar Reembolso
            </button>
          )}
        </div>
      )}

      {isPending && (
        <p className="tx-status pending">Esperando confirmacion en MetaMask...</p>
      )}
      {isConfirming && (
        <p className="tx-status confirming">Confirmando transaccion...</p>
      )}
      {successMsg && <p className="tx-status success">{successMsg}</p>}
      {error && (
        <p className="tx-status error">
          Error: {(error as { shortMessage?: string }).shortMessage ?? error.message}
        </p>
      )}
    </div>
  );
}

export default JobDetail;
