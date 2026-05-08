package app.momentra.ui.shell

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import app.momentra.data.AuthRepository
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.LocalMomentraTheme
import app.momentra.ui.theme.MomentraBase
import app.momentra.ui.theme.MomentraContext
import app.momentra.ui.theme.MomentraScreenChrome

@Composable
fun MainShell(
    authRepository: AuthRepository,
    initialContext: MomentraContext = MomentraContext.Personal,
    onSignOut: () -> Unit,
) {
    var selectedContext by remember { mutableStateOf(initialContext) }
    var selectedTab by remember { mutableStateOf(MainTab.Today) }

    MomentraScreenChrome(
        context = selectedContext,
        headerHeight = 160.dp,
        orbSize = 360.dp,
        orbOffsetY = (-178).dp,
        orbExtraOpacity = 0.02f,
    ) { _ ->
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Context Switcher
                ContextSwitcher(
                    selectedContext = selectedContext,
                    onSelect = { ctx ->
                        selectedContext = ctx
                        selectedTab = MainTab.Today
                    },
                    modifier = Modifier.fillMaxWidth(),
                )

                // Divider
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .height(0.5.dp)
                        .background(MomentraBase.s300.copy(alpha = 0.45f))
                )

                // Tab Content (scrollable)
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 16.dp)
                ) {
                    TabContentRouter(
                        context = selectedContext,
                        tab = selectedTab,
                        authRepository = authRepository,
                    )
                }
            }

            // Bottom Nav (fixed at bottom)
            BottomNavBar(
                selectedTab = selectedTab,
                onSelect = { selectedTab = it },
                context = selectedContext,
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }
    }
}

@Composable
private fun TabContentRouter(
    context: MomentraContext,
    tab: MainTab,
    authRepository: AuthRepository,
) {
    val content: @Composable () -> Unit = {
        when (tab) {
            MainTab.Today -> TodayRouter(context = context, authRepository = authRepository)
            MainTab.Plan -> PlanRouter(context = context)
            MainTab.Activity -> ActivityRouter(context = context)
            MainTab.People -> PeopleRouter(context = context)
            MainTab.Me -> PlaceholderView("Me")
        }
    }

    AnimatedContent(
        targetState = tab to context,
        transitionSpec = { fadeIn() togetherWith fadeOut() },
        label = "tab_content",
    ) {
        content()
    }
}

@Composable
private fun TodayRouter(
    context: MomentraContext,
    authRepository: AuthRepository,
) {
    when (context) {
        MomentraContext.Personal -> PersonalTodayTab(authRepository = authRepository)
        MomentraContext.Group -> GroupTodayTab()
        MomentraContext.Business -> PlaceholderView("Business · Today")
        MomentraContext.Circle -> PlaceholderView("Circle · Today")
    }
}

@Composable
private fun PlanRouter(
    context: MomentraContext,
) {
    when (context) {
        MomentraContext.Group -> GroupPlanTab()
        else -> PlaceholderView("${context.displayName} · Plan")
    }
}

@Composable
private fun ActivityRouter(
    context: MomentraContext,
) {
    when (context) {
        MomentraContext.Group -> GroupActivityTab()
        else -> PlaceholderView("${context.displayName} · Activity")
    }
}

@Composable
private fun PeopleRouter(
    context: MomentraContext,
) {
    when (context) {
        MomentraContext.Group -> PlaceholderView("Group · People")
        else -> PlaceholderView("${context.displayName} · ${MainTab.People.labelFor(context)}")
    }
}

@Composable
private fun PlaceholderView(title: String) {
    Column {
        Text(
            text = title,
            style = DesignTokens.type.titleXL,
            color = MomentraBase.onDark,
        )
        Text(
            text = "This view is coming soon.",
            style = DesignTokens.type.caption,
            color = MomentraBase.onDark60,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}
