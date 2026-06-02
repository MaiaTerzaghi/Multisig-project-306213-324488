import { useState } from "react";

interface NewProposalFormProps {
  isSigner: boolean;
  loading: boolean;
  onPropose: (to: string, value: string, data: string) => Promise<void>;
}

export default function NewProposalForm({ isSigner, loading, onPropose }: NewProposalFormProps) {
  const [to, setTo] = useState("");
  const [value, setValue] = useState("");
  const [data, setData] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to) return;
    await onPropose(to, value || "0", data || "0x");
    // Limpiar formulario después de enviar
    setTo("");
    setValue("");
    setData("");
  };

  return (
    <div className="card">
      <h2>Nueva Propuesta</h2>

      {!isSigner ? (
        <p style={{ color: "#9ca3af" }}>Conectá una wallet signer para proponer.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Direccion destino (0x...)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Valor en ETH (ej: 0.1)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <input
            type="text"
            placeholder="Calldata en hex (opcional, default: 0x)"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
          <button type="submit" className="btn btn-propose" disabled={loading || !to}>
            {loading ? "Enviando..." : "Proponer"}
          </button>
        </form>
      )}
    </div>
  );
}
