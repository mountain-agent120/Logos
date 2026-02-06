import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import Home from '../page'
import { PublicKey } from '@solana/web3.js'

// Mock Wallet Adapter
const mockSendTransaction = jest.fn()
jest.mock('@solana/wallet-adapter-react', () => ({
    useConnection: () => ({ connection: {} }),
    useWallet: () => ({
        publicKey: new PublicKey("11111111111111111111111111111111"),
        sendTransaction: mockSendTransaction
    })
}));

// Mock Wallet UI
jest.mock('@solana/wallet-adapter-react-ui', () => ({
    WalletMultiButton: () => <button data-testid="wallet-connect-btn">Connect Wallet</button>
}));

// Mock PDA derivation
// Use valid 32-byte Base58 string (SystemProgram ID) for mock
jest.spyOn(PublicKey, 'findProgramAddressSync').mockReturnValue([
    new PublicKey("11111111111111111111111111111111"),
    255
]);

describe('Home Component', () => {
    beforeEach(() => {
        mockSendTransaction.mockReset()
        mockSendTransaction.mockResolvedValue('mock_signature_123')
    })

    it('renders correctly', () => {
        render(<Home />)
        expect(screen.getByText('Logos')).toBeInTheDocument()
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('enables scan button when wallet is connected', () => {
        render(<Home />)
        const button = screen.getByText('Scan & Log Decision') as HTMLButtonElement
        expect(button).not.toBeDisabled()
    })

    it('calls sendTransaction when Scan button is clicked', async () => {
        render(<Home />)
        const button = screen.getByText('Scan & Log Decision')

        await act(async () => {
            fireEvent.click(button)
        })

        await waitFor(() => {
            expect(mockSendTransaction).toHaveBeenCalled()
        })
    })
})
