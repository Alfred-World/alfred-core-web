import { defineConfig } from 'orval'

const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL

// Common output configuration
const commonOutputConfig = {
    client: 'react-query' as const,
    override: {
        mutator: {
            path: 'src/libs/custom-instance.ts',
            name: 'customInstance'
        },
        query: {
            useQuery: true,
            useMutation: true,
            useInfinite: false,
            options: {
                staleTime: 10000
            }
        }
    }
}

export default defineConfig({
    // Identity Service API (contains Auth, SSO endpoints)
    identity: {
        input: `${gatewayUrl}/api/identity/swagger/v1/swagger.json`,
        output: {
            mode: 'single',
            target: 'src/generated/identity-api.ts',
            client: commonOutputConfig.client,
            override: commonOutputConfig.override
        }
    }
})
