import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import AccountPanel from "./components/AccountPanel";
import JobBoard from "./components/JobBoard";
import JobDetail from "./components/JobDetail";
import CreateJobForm from "./components/CreateJobForm";

type View = "board" | "detail" | "create";

function App() {
  const { isConnected } = useAccount();
  const [view, setView] = useState<View>("board");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  if (!isConnected) {
    return (
      <div className="connect-screen">
        <h1>Job Marketplace</h1>
        <p>Conecta tu billetera para comenzar</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1 onClick={() => setView("board")} style={{ cursor: "pointer" }}>
          Job Marketplace
        </h1>
        <ConnectButton />
      </header>

      <AccountPanel />

      <nav className="nav">
        <button
          className={view === "board" ? "active" : ""}
          onClick={() => setView("board")}
        >
          Tablero
        </button>
        <button
          className={view === "create" ? "active" : ""}
          onClick={() => setView("create")}
        >
          Publicar Trabajo
        </button>
      </nav>

      {view === "board" && (
        <JobBoard
          onSelectJob={(id) => {
            setSelectedJobId(id);
            setView("detail");
          }}
        />
      )}

      {view === "detail" && selectedJobId !== null && (
        <JobDetail
          jobId={selectedJobId}
          onBack={() => setView("board")}
        />
      )}

      {view === "create" && (
        <CreateJobForm onCreated={() => setView("board")} />
      )}
    </div>
  );
}

export default App;
