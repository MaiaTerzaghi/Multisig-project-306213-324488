import { useEffect, useState } from "react";
import { ethers } from "ethers";
import type { Proposal } from "../hooks/useMultisig";

interface ProposalListProps {
  proposals: Proposal[];
  threshold: number;
  account: string | null;
  isSigner: boolean;
  loading: boolean;
  onApprove: (id: number) => Promise<void>;
  onExecute: (id: number) => Promise<void>;
  onCancel: (id: number) => Promise<void>;
  hasUserApproved: (id: number) => Promise<boolean>;
}

export default function ProposalList({
  proposals,
  threshold,
  account,
  isSigner,
  loading,
  onApprove,
  onExecute,
  onCancel,
  hasUserApproved,
}: ProposalListProps) {
  // Estado para trackear qué propuestas ya aprobó el usuario
  const [approvedMap, setApprovedMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const checkApprovals = async () => {
      const map: Record<number, boolean> = {};
      for (const p of proposals) {
        if (!p.executed && !p.cancelled) {
          map[p.id] = await hasUserApproved(p.id);
        }
      }
      setApprovedMap(map);
    };
    if (account && isSigner) {
      checkApprovals();
    }
  }, [proposals, account, isSigner, hasUserApproved]);

  const getStatus = (p: Proposal) => {
    if (p.executed) return { label: "Ejecutada", className: "status-executed" };
    if (p.cancelled) return { label: "Cancelada", className: "status-cancelled" };
    return { label: "Pendiente", className: "status-pending" };
  };

  if (proposals.length === 0) {
    return (
      <div className="card">
        <h2>Propuestas</h2>
        <p style={{ color: "#9ca3af" }}>No hay propuestas todavia.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Propuestas</h2>

      {proposals.map((p) => {
        const status = getStatus(p);
        const canApprove = isSigner && !p.executed && !p.cancelled && !approvedMap[p.id];
        const canExecute = isSigner && !p.executed && !p.cancelled && p.approvalCount >= threshold;
        const canCancel =
          account &&
          !p.executed &&
          !p.cancelled &&
          p.proposer.toLowerCase() === account.toLowerCase();

        return (
          <div key={p.id} className="proposal-item">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <strong>Propuesta #{p.id}</strong>
              <span className={`status ${status.className}`}>{status.label}</span>
            </div>

            <div className="info-row">
              <span className="info-label">Destino:</span> {p.destination}
            </div>
            <div className="info-row">
              <span className="info-label">Valor:</span> {ethers.formatEther(p.value)} ETH
            </div>
            <div className="info-row">
              <span className="info-label">Aprobaciones:</span> {p.approvalCount} / {threshold}
            </div>
            <div className="info-row">
              <span className="info-label">Proponente:</span> {p.proposer}
            </div>
            {p.data !== "0x" && (
              <div className="info-row">
                <span className="info-label">Calldata:</span>{" "}
                <span style={{ fontSize: "0.8rem" }}>{p.data}</span>
              </div>
            )}

            {/* Botones de acción */}
            {!p.executed && !p.cancelled && isSigner && (
              <div style={{ marginTop: "0.75rem" }}>
                <button
                  className="btn btn-approve"
                  disabled={loading || !canApprove}
                  onClick={() => onApprove(p.id)}
                >
                  {approvedMap[p.id] ? "Ya aprobaste" : "Aprobar"}
                </button>

                <button
                  className="btn btn-execute"
                  disabled={loading || !canExecute}
                  onClick={() => onExecute(p.id)}
                >
                  Ejecutar
                </button>

                {canCancel && (
                  <button
                    className="btn btn-cancel"
                    disabled={loading}
                    onClick={() => onCancel(p.id)}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
