import { useMultisig } from "./hooks/useMultisig";
import ConnectWallet from "./components/ConnectWallet";
import ContractInfo from "./components/ContractInfo";
import NewProposalForm from "./components/NewProposalForm";
import ProposalList from "./components/ProposalList";

export default function App() {
  const {
    signers,
    threshold,
    proposals,
    contractAddress,
    account,
    isSigner,
    isConnected,
    loading,
    error,
    successMsg,
    connectWallet,
    propose,
    approveProposal,
    executeProposal,
    cancelProposal,
    hasUserApproved,
  } = useMultisig();

  return (
    <div className="app">
      <h1>Multisig DApp</h1>

      <ConnectWallet
        account={account}
        isConnected={isConnected}
        onConnect={connectWallet}
      />

      {error && <div className="error-msg" style={{ textAlign: "center", marginBottom: "1rem" }}>{error}</div>}
      {successMsg && <div className="success-msg" style={{ textAlign: "center", marginBottom: "1rem" }}>{successMsg}</div>}

      {isConnected && (
        <>
          <ContractInfo
            contractAddress={contractAddress}
            signers={signers}
            threshold={threshold}
            account={account}
            isSigner={isSigner}
          />

          <NewProposalForm
            isSigner={isSigner}
            loading={loading}
            onPropose={propose}
          />

          <ProposalList
            proposals={proposals}
            threshold={threshold}
            account={account}
            isSigner={isSigner}
            loading={loading}
            onApprove={approveProposal}
            onExecute={executeProposal}
            onCancel={cancelProposal}
            hasUserApproved={hasUserApproved}
          />
        </>
      )}

      {loading && <div className="loading">Procesando transaccion...</div>}
    </div>
  );
}
