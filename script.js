// Zora Testnet Configuration
const ZORA_TESTNET = {
    chainId: '0x3B9AC9FF', // 999999999 in hex
    chainName: 'Zora Testnet',
    nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
    },
    rpcUrls: ['https://testnet.rpc.zora.energy'],
    blockExplorerUrls: ['https://sepolia.explorer.zora.energy']
};

const BRIDGE_CONTRACT = '0x5376f1D543dcbB5BD416c56C189e4cB7399fCcCB';
const SEPOLIA_CHAIN_ID = '0xAA36A7'; // 11155111 in hex

class ZoraBridge {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        // Check if already connected
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await this.connectWallet();
                }
            } catch (error) {
                console.log('Not connected');
            }
        }
    }

    setupEventListeners() {
        // Connect Wallet Button
        document.getElementById('connectWallet').addEventListener('click', () => {
            this.connectWallet();
        });

        // Add Network Button
        document.getElementById('addNetworkBtn').addEventListener('click', () => {
            this.addZoraNetwork();
        });

        // Explorer Button
        document.getElementById('explorerBtn').addEventListener('click', () => {
            window.open('https://sepolia.explorer.zora.energy', '_blank');
        });

        // GitHub Button
        document.getElementById('githubBtn').addEventListener('click', () => {
            window.open('https://github.com/dcjanio/zora-testnet-bridge', '_blank');
        });

        // Max Button
        document.getElementById('maxBtn').addEventListener('click', () => {
            this.setMaxAmount();
        });

        // Bridge Button
        document.getElementById('bridgeBtn').addEventListener('click', () => {
            this.bridge();
        });

        // Amount input validation
        document.getElementById('amount').addEventListener('input', (e) => {
            this.validateAmount(e.target.value);
        });

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.connectWallet();
                }
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }
    }

    async connectWallet() {
        if (!window.ethereum) {
            this.showNotification('Please install MetaMask or another Web3 wallet!', 'error');
            return;
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });

            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            this.userAddress = accounts[0];
            this.isConnected = true;

            // Switch to Sepolia if not already
            await this.switchToSepolia();

            // Update UI
            this.updateWalletUI();
            await this.updateBalance();

            this.showNotification('Wallet connected successfully!', 'success');
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            this.showNotification('Failed to connect wallet. Please try again.', 'error');
        }
    }

    async switchToSepolia() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: SEPOLIA_CHAIN_ID }],
            });
        } catch (error) {
            if (error.code === 4902) {
                // Chain not added, add Sepolia
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: SEPOLIA_CHAIN_ID,
                            chainName: 'Ethereum Sepolia',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://sepolia.infura.io/v3/'],
                            blockExplorerUrls: ['https://sepolia.etherscan.io']
                        }]
                    });
                } catch (addError) {
                    console.error('Failed to add Sepolia:', addError);
                }
            }
        }
    }

    async addZoraNetwork() {
        if (!window.ethereum) {
            this.showNotification('Please install MetaMask or another Web3 wallet!', 'error');
            return;
        }

        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [ZORA_TESTNET]
            });
            this.showNotification('Zora Testnet added to your wallet!', 'success');
        } catch (error) {
            console.error('Failed to add Zora network:', error);
            this.showNotification('Failed to add Zora Testnet. Please try again.', 'error');
        }
    }

    async updateBalance() {
        if (!this.provider || !this.userAddress) return;

        try {
            const balance = await this.provider.getBalance(this.userAddress);
            const balanceInEth = ethers.utils.formatEther(balance);
            document.getElementById('walletBalance').textContent = parseFloat(balanceInEth).toFixed(4);
        } catch (error) {
            console.error('Failed to get balance:', error);
        }
    }

    updateWalletUI() {
        const connectBtn = document.getElementById('connectWallet');
        const walletText = document.getElementById('walletText');
        const walletInfo = document.getElementById('walletInfo');
        const walletAddress = document.getElementById('walletAddress');

        if (this.isConnected) {
            walletText.textContent = 'WALLET CONNECTED';
            connectBtn.style.background = 'linear-gradient(135deg, #10b981, #06b6d4)';
            walletInfo.classList.remove('hidden');
            walletAddress.textContent = `${this.userAddress.slice(0, 6)}...${this.userAddress.slice(-4)}`;
        } else {
            walletText.textContent = 'CONNECT WALLET';
            connectBtn.style.background = 'linear-gradient(135deg, var(--cosmic-purple), var(--cosmic-pink))';
            walletInfo.classList.add('hidden');
        }
    }

    async setMaxAmount() {
        if (!this.provider || !this.userAddress) {
            this.showNotification('Please connect your wallet first!', 'error');
            return;
        }

        try {
            const balance = await this.provider.getBalance(this.userAddress);
            const balanceInEth = ethers.utils.formatEther(balance);
            // Leave some ETH for gas fees
            const maxAmount = Math.max(0, parseFloat(balanceInEth) - 0.01);
            document.getElementById('amount').value = maxAmount.toFixed(4);
            this.validateAmount(maxAmount.toString());
        } catch (error) {
            console.error('Failed to get max amount:', error);
            this.showNotification('Failed to get balance. Please try again.', 'error');
        }
    }

    validateAmount(amount) {
        const bridgeBtn = document.getElementById('bridgeBtn');
        const isValid = amount && parseFloat(amount) > 0 && this.isConnected;
        
        bridgeBtn.disabled = !isValid;
        
        if (isValid) {
            bridgeBtn.style.opacity = '1';
            bridgeBtn.style.cursor = 'pointer';
        } else {
            bridgeBtn.style.opacity = '0.5';
            bridgeBtn.style.cursor = 'not-allowed';
        }
    }

    async bridge() {
        const amount = document.getElementById('amount').value;
        
        if (!this.isConnected) {
            this.showNotification('Please connect your wallet first!', 'error');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            this.showNotification('Please enter a valid amount!', 'error');
            return;
        }

        try {
            // Show loading state
            const bridgeBtn = document.getElementById('bridgeBtn');
            const originalText = bridgeBtn.textContent;
            bridgeBtn.textContent = 'BRIDGING... ⏳';
            bridgeBtn.disabled = true;

            // Simple ETH transfer to bridge contract
            const tx = await this.signer.sendTransaction({
                to: BRIDGE_CONTRACT,
                value: ethers.utils.parseEther(amount)
            });

            this.showNotification(`Transaction submitted! Hash: ${tx.hash}`, 'success');
            
            // Wait for confirmation
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                this.showNotification('Bridge successful! Your ETH will appear on Zora Testnet in 5-10 minutes.', 'success');
                
                // Clear amount
                document.getElementById('amount').value = '';
                
                // Update balance
                await this.updateBalance();
                
                // Suggest adding Zora network
                setTimeout(() => {
                    if (confirm('Bridge successful! Would you like to add Zora Testnet to your wallet to see your bridged ETH?')) {
                        this.addZoraNetwork();
                    }
                }, 2000);
            } else {
                this.showNotification('Transaction failed. Please try again.', 'error');
            }

            // Restore button
            bridgeBtn.textContent = originalText;
            bridgeBtn.disabled = false;
            this.validateAmount(amount);

        } catch (error) {
            console.error('Bridge failed:', error);
            
            let errorMessage = 'Bridge failed. Please try again.';
            if (error.code === 4001) {
                errorMessage = 'Transaction cancelled by user.';
            } else if (error.code === -32603) {
                errorMessage = 'Insufficient funds for gas.';
            }
            
            this.showNotification(errorMessage, 'error');
            
            // Restore button
            const bridgeBtn = document.getElementById('bridgeBtn');
            bridgeBtn.textContent = 'BRIDGE TO ZORA ☾☼☽';
            bridgeBtn.disabled = false;
            this.validateAmount(document.getElementById('amount').value);
        }
    }

    disconnect() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        this.updateWalletUI();
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'linear-gradient(135deg, #ef4444, #f97316)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            max-width: 400px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;

        // Add animation keyframes if not already added
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Initialize the bridge when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ZoraBridge();
});

// Add some cosmic effects
document.addEventListener('mousemove', (e) => {
    const cursor = document.querySelector('.cosmic-cursor');
    if (!cursor) {
        const cosmicCursor = document.createElement('div');
        cosmicCursor.className = 'cosmic-cursor';
        cosmicCursor.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.6), transparent);
            border-radius: 50%;
            pointer-events: none;
            mix-blend-mode: screen;
            z-index: 9999;
            transition: transform 0.1s ease;
        `;
        document.body.appendChild(cosmicCursor);
    }
    
    const cosmicCursor = document.querySelector('.cosmic-cursor');
    cosmicCursor.style.left = e.clientX - 10 + 'px';
    cosmicCursor.style.top = e.clientY - 10 + 'px';
});

// Add floating particles effect
function createFloatingParticles() {
    const particleContainer = document.createElement('div');
    particleContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
    `;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            animation: float ${5 + Math.random() * 10}s linear infinite;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 5}s;
        `;
        particleContainer.appendChild(particle);
    }
    
    document.body.appendChild(particleContainer);
}

// Add particle animation styles
const particleStyles = document.createElement('style');
particleStyles.textContent = `
    @keyframes float {
        0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
    }
`;
document.head.appendChild(particleStyles);

// Initialize particles
setTimeout(createFloatingParticles, 1000); 