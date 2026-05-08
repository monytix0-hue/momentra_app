//
//  Item.swift
//  momentra_v1
//
//  Created by santosh on 26/04/26.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
