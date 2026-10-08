import UIKit
import Capacitor

/// Capacitor bridge with iOS edge-swipe back/forward navigation enabled.
/// React Router history then responds to the system swipe-from-left gesture.
class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
    }
}
