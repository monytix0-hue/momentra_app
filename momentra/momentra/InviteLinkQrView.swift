import CoreImage.CIFilterBuiltins
import SwiftUI
import UIKit

enum InviteLinkQrImage {
    static func uiImage(from string: String, pointSize: CGFloat = 180) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        let scale = pointSize / output.extent.width
        let scaled = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        guard let cg = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}

struct InviteLinkQrView: View {
    let urlString: String

    var body: some View {
        Group {
            if urlString.isEmpty {
                EmptyView()
            } else if let img = InviteLinkQrImage.uiImage(from: urlString) {
                Image(uiImage: img)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 200, maxHeight: 200)
                    .padding(.vertical, 8)
            } else {
                Text("Could not build QR")
                    .font(DesignTokens.type.caption)
                    .foregroundColor(MomentraBase.onDark60)
            }
        }
    }
}
