// Type Imports
import type { ChildrenType, Direction } from '@core/types'

// Context Imports
import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'
import ReduxProvider from '@/redux-store/ReduxProvider'

// Styled Component Imports
import AppReactToastify from '@/libs/styles/AppReactToastify'

// Util Imports
import { getMode, getSettingsFromCookie, getSystemMode } from '@core/utils/serverHelpers'
import QueryProvider from '@/providers/query-provider'
import { NextAuthProvider } from '@/providers/next-auth-provider'

type Props = ChildrenType & {
  direction: Direction
}

/**
 * App Providers - wraps the application with necessary context providers
 * Note: NextAuth and SSOSync removed - using OIDC client-side authentication
 */
const Providers = async (props: Props) => {
  // Props
  const { children, direction } = props

  // Vars
  const mode = await getMode()
  const settingsCookie = await getSettingsFromCookie()
  const systemMode = await getSystemMode()

  return (
    <VerticalNavProvider>
      <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
        <ThemeProvider direction={direction} systemMode={systemMode}>
            <NextAuthProvider>
              <QueryProvider>
                <ReduxProvider>{children}</ReduxProvider>
                <AppReactToastify direction={direction} hideProgressBar />
              </QueryProvider>
            </NextAuthProvider>
        </ThemeProvider>
      </SettingsProvider>
    </VerticalNavProvider>
  )
}

export default Providers
