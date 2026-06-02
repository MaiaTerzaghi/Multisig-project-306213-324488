interface ContractInfoProps {
  contractAddress: string;
  signers: string[];
  threshold: number;
  account: string | null;
  isSigner: boolean;
}

export default function ContractInfo({
  contractAddress,
  signers,
  threshold,
  account,
  isSigner,
}: ContractInfoProps) {
  return (
    <div className="card">
      <h2>Informacion del Contrato</h2>

      <div className="info-row">
        <span className="info-label">Direccion:</span>
        <br />
        {contractAddress}
      </div>

      <div className="info-row">
        <span className="info-label">Umbral de aprobaciones:</span> {threshold} de {signers.length} firmantes
      </div>

      <div className="info-row">
        <span className="info-label">Firmantes:</span>
        <ul style={{ listStyle: "none", paddingLeft: 0, marginTop: "0.5rem" }}>
          {signers.map((s, i) => (
            <li key={i} style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              {s}
              {account && s.toLowerCase() === account.toLowerCase() && (
                <span style={{ color: "#7c3aed", marginLeft: "0.5rem" }}>(vos)</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {account && !isSigner && (
        <div className="warning">
          Tu billetera no es firmante de este contrato. No podes proponer, aprobar ni ejecutar.
        </div>
      )}
    </div>
  );
}
