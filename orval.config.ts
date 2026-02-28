import { defineConfig } from 'orval'

const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL

// Common output configuration
const commonOutputConfig = {
    client: 'react-query' as const,
    httpClient: 'fetch' as const,
    override: {
        mutator: {
            path: 'src/libs/custom-instance.ts',
            name: 'customFetch'
        },
        query: {
            useQuery: true,
            useMutation: true,
            useInfinite: false,
            options: {
                staleTime: 10000
            }
        },
        fetch: {
            includeHttpResponseReturnType: false
        }
    }
}

export default defineConfig({
    // Identity Service API (contains Auth, SSO endpoints)
    gateway: {
        input: `${gatewayUrl}/api-docs/v1.json`,
        output: {
            mode: 'single',
            target: 'src/generated/api.ts',
            client: commonOutputConfig.client,
            httpClient: commonOutputConfig.httpClient,
            override: commonOutputConfig.override
        }
    }
})
