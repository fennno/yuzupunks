import EmailCapture from './components/EmailCapture'
import UnlockGate   from './components/UnlockGate'

// Public landing — email capture + a faint unlock affordance bottom-left that
// gates entry to the full /site experience while it's WIP.
export default function Home() {
  return (
    <>
      <EmailCapture />
      <UnlockGate />
    </>
  )
}
