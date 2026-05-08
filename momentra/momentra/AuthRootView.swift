//
//  AuthRootView.swift
//  momentra
//
//  Entry after onboarding: phone-first auth (OB-MVP-3).
//

import SwiftUI

struct AuthRootView: View {
    var body: some View {
        NavigationStack {
            PhoneLoginView()
        }
    }
}

#Preview {
    AuthRootView()
}
