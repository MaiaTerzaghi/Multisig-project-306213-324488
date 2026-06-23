import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { MARKETPLACE_ADDRESS } from "../config";
import marketplaceAbi from "../abi/JobMarketplace.json";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

interface Props {
  onCreated: () => void;
}

function CreateJobForm({ onCreated }: Props) {
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [evaluator, setEvaluator] = useState("");
  const [provider, setProvider] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");

  const { writeContract, data: txHash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        reset();
        onCreated();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onCreated, reset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const budgetWei = parseEther(budget);
    const expiresAt = BigInt(
      Math.floor(Date.now() / 1000) + Number(expiresInDays) * 86400
    );
    const providerAddr = provider || ZERO_ADDR;

    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi as readonly unknown[],
      functionName: "createJob",
      args: [
        description,
        budgetWei,
        evaluator as `0x${string}`,
        providerAddr as `0x${string}`,
        expiresAt,
      ],
    });
  };

  return (
    <div className="create-job">
      <h2>Publicar Trabajo</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Descripcion
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Describe el trabajo a realizar..."
          />
        </label>

        <label>
          Budget (mUSD)
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            required
            placeholder="100"
          />
        </label>

        <label>
          Evaluador (address) *
          <input
            value={evaluator}
            onChange={(e) => setEvaluator(e.target.value)}
            required
            placeholder="0x... o address del Multisig"
          />
        </label>

        <label>
          Proveedor (address, opcional)
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="0x... (dejar vacio para asignar despues)"
          />
        </label>

        <label>
          Expira en (dias)
          <input
            type="number"
            min="1"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={isPending || isConfirming}>
          {isPending
            ? "Confirma en MetaMask..."
            : isConfirming
            ? "Confirmando..."
            : "Crear Trabajo"}
        </button>

        {isSuccess && (
          <p className="tx-status success">Trabajo creado exitosamente</p>
        )}
        {error && (
          <p className="tx-status error">
            Error:{" "}
            {(error as { shortMessage?: string }).shortMessage ?? error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default CreateJobForm;
