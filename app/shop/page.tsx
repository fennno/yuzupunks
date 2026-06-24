import EmailCapture from '../components/EmailCapture'

// /shop is gated by proxy.ts (reachable only once unlocked). Placeholder until
// the real shop lands — swap <EmailCapture/> for the storefront when ready.
export default function ShopPage() {
  return <EmailCapture />
}
