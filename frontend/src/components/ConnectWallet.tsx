interface ConnectWalletProps {
  account: string | null;
  isConnected: boolean;
  onConnect: () => void;
}

export default function ConnectWallet({ account, isConnected, onConnect }: ConnectWalletProps) {
  if (isConnected && account) {
    return (
      <button className="connect-btn" style={{ background: "#059669" }}>
        {account.slice(0, 6)}...{account.slice(-4)}
      </button>
    );
  }

  return (
    <button className="connect-btn" onClick={onConnect}>
      Conectar Billetera
    </button>
  );
}
