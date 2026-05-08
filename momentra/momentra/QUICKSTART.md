# Momentra Design System — Quick Start

## ✅ Installation Complete

All design token files have been added to your project. The system is ready to use!

## 🎯 What You Have

### Design Token System
- ✅ 4 context themes (Personal, Group, Business, Circle)
- ✅ Complete urgency system (HIGH/MEDIUM/CLEAR)
- ✅ Typography, spacing, radius, sizing, animation tokens
- ✅ INR currency formatters
- ✅ Avatar color variants

### Components
- ✅ **LaunchScreenView** — Animated splash screen (~3.3s)
- ✅ **MomentCard** — Example card component with best practices
- ✅ **DesignTokensDemo** — Interactive showcase of all tokens

### Documentation
- ✅ **DESIGN_SYSTEM.md** — Complete reference guide
- ✅ Inline code examples
- ✅ Design rules (R01-R17)

## 🚀 Quick Usage

### 1. Run Your App

The splash screen is already integrated in `momentraApp.swift`. Just build and run!

### 2. View Design Tokens Demo

Replace `ContentView()` with `DesignTokensDemo()` in your app to see all tokens:

```swift
@main
struct momentraApp: App {
    var body: some Scene {
        WindowGroup {
            DesignTokensDemo()  // Try this to see the demo
        }
    }
}
```

### 3. Create Your First Moment Card

```swift
struct MyView: View {
    var body: some View {
        ScrollView {
            MomentCard(
                title: "Emergency Fund",
                type: "Savings",
                amountCurrent: 38000,
                amountGoal: 100000,
                daysRemaining: 62,
                urgencyLevel: .clear,
                context: .personal
            )
            .padding()
        }
        .momentraBackground()
    }
}
```

### 4. Build Custom Components

```swift
struct MyCustomCard: View {
    @Environment(\.momentraContext) var context
    
    var theme: ContextTheme {
        DesignTokens.theme(for: context)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.spacing.section) {
            Text("My Title")
                .font(DesignTokens.type.titleLG)
                .foregroundColor(DesignTokens.base.onDark)
            
            Text("Subtitle")
                .font(DesignTokens.type.body)
                .foregroundColor(DesignTokens.base.onDark.opacity(0.6))
            
            // Context-aware badge
            Text("PERSONAL")
                .font(DesignTokens.type.micro)
                .foregroundColor(theme.text)
                .padding(8)
                .background(theme.surface)
                .cornerRadius(DesignTokens.radius.pill)
        }
        .padding(DesignTokens.spacing.cardH)
        .background(DesignTokens.base.s100)
        .cornerRadius(DesignTokens.radius.card)
    }
}
```

## 📝 Key Patterns

### Always Use These Patterns

```swift
// ✅ Screen background
.momentraBackground()

// ✅ Set context
.momentraContext(.personal)

// ✅ Get context theme
let theme = DesignTokens.theme(for: context)

// ✅ Use tokens
.font(DesignTokens.type.titleXL)
.foregroundColor(DesignTokens.base.onDark)
.padding(DesignTokens.spacing.screenH)
.cornerRadius(DesignTokens.radius.card)
```

### Never Do These

```swift
// ❌ Never hardcode colors
.foregroundColor(.white)  // Use DesignTokens.base.onDark

// ❌ Never hardcode sizes
.padding(20)  // Use DesignTokens.spacing.screenH

// ❌ Never use wrong background
.background(.black)  // Use .momentraBackground()

// ❌ Never ignore urgency rules
// When urgencyLevel is HIGH/MEDIUM, use DesignTokens.urgency.*
// NOT context colors!
```

## 🎨 Context Switcher Example

```swift
struct ContextSwitcherDemo: View {
    @State private var selectedContext: MomentraContext = .personal
    
    var body: some View {
        VStack {
            // Context picker
            Picker("Context", selection: $selectedContext) {
                ForEach(MomentraContext.allCases, id: \.self) { context in
                    Text(context.displayName).tag(context)
                }
            }
            .pickerStyle(.segmented)
            .padding()
            
            // Content that adapts to context
            MomentCard(
                title: "Sample Moment",
                type: "Demo",
                amountCurrent: 50000,
                amountGoal: 100000,
                daysRemaining: 30,
                urgencyLevel: .clear,
                context: selectedContext
            )
            .padding()
        }
        .momentraBackground()
        .momentraContext(selectedContext)
    }
}
```

## 🎬 Splash Screen

Already integrated! Plays for ~3.3 seconds on app launch.

To customize duration or disable:

```swift
// In momentraApp.swift
@State private var showSplash = true  // Set to false to disable

// Or change duration
DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {  // Change 3.3 to 5.0
    onFinish?()
}
```

## 📚 Next Steps

1. **Read DESIGN_SYSTEM.md** for complete documentation
2. **Run DesignTokensDemo** to see all tokens in action
3. **Study MomentCard.swift** for component best practices
4. **Check design rules** (R01-R17) before building features
5. **Reference momentra_themekit_v2.2.html** for visual specs

## 🐛 Troubleshooting

### Colors not showing?
- Check `.momentraBackground()` is applied
- Verify all files are in Xcode target

### Context not switching?
- Use `.momentraContext(context)` modifier
- Access via `@Environment(\.momentraContext)`

### Splash not showing?
- Check `showSplash` state in app file
- Verify LaunchScreenView.swift is in target

## 💡 Pro Tips

1. **Always reference tokens** — Never hardcode values
2. **Respect urgency rules** — They override context colors
3. **Use .momentraBackground()** — On every root view
4. **Check orbOpacity** — Group context uses 0.30, others use 0.25
5. **Funding bars are special** — Always use context.accent (Rule R03)

## 🎉 You're Ready!

Start building Momentra features with confidence. The design system handles all theming automatically.

Questions? Check the full DESIGN_SYSTEM.md documentation.
