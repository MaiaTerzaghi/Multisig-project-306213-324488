import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { MARKETPLACE_ADDRESS } from "../config";
import marketplaceAbi from "../abi/JobMarketplace.json";

const STATUS_LABELS = [
  "Abierto",
  "Fondeado",
  "Entregado",
  "Completado",
  "Rechazado",
  "Expirado",
];

const STATUS_COLORS = [
  "#4285f4",
  "#34a853",
  "#a142f4",
  "#0d7a3e",
  "#ea4335",
  "#f9ab00",
];

interface Props {
  onSelectJob: (id: number) => void;
}

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

function JobCard({ jobId, onClick }: { jobId: number; onClick: () => void }) {
  const { data } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: marketplaceAbi,
    functionName: "getJob",
    args: [BigInt(jobId)],
  });

  if (!data) return <div className="job-card loading">Cargando...</div>;

  const job = data as unknown as JobData;
  const status = Number(job.status);
  const budget = formatEther(job.budget);

  return (
    <div className="job-card" onClick={onClick}>
      <div className="job-card-header">
        <span className="job-id">#{jobId}</span>
        <span
          className="status-badge"
          style={{ background: STATUS_COLORS[status] }}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
      <p className="job-description">{job.description}</p>
      <div className="job-card-footer">
        <span>{budget} mUSD</span>
        <span className="client-addr">
          {job.client.slice(0, 6)}...{job.client.slice(-4)}
        </span>
      </div>
    </div>
  );
}

function JobBoard({ onSelectJob }: Props) {
  const { data: jobCount } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: marketplaceAbi,
    functionName: "getJobCount",
  });

  const count = Number(jobCount ?? 0);

  return (
    <div className="job-board">
      <h2>Trabajos</h2>
      {count === 0 && <p className="empty">No hay trabajos publicados</p>}
      {Array.from({ length: count }, (_, i) => count - 1 - i).map((id) => (
        <JobCard key={id} jobId={id} onClick={() => onSelectJob(id)} />
      ))}
    </div>
  );
}

export default JobBoard;
