import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border)] py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold gradient-text">dGameBet</span>
            <Badge variant="info">Sepolia</Badge>
          </div>
          <div className="flex items-center gap-6 text-sm text-foreground-subtle">
            <a
              href="https://sepolia.etherscan.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground-muted transition-colors"
            >
              Etherscan <ExternalLink size={12} />
            </a>
            <a
              href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground-muted transition-colors"
            >
              Faucet <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
