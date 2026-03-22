import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  type NormalizedCacheObject,
} from '@apollo/client'

/**
 * URI for the GraphQL API.
 * Uses environment variable or defaults to the proxied path.
 */
const uri: string = import.meta.env.VITE_API_URL || '/graphql'

const link: HttpLink = new HttpLink({
  uri,
  credentials: 'include',
})

/**
 * Apollo Client instance for GemTest Web.
 * Configured to communicate with the Apollo Server at /graphql.
 */
export const client: ApolloClient<NormalizedCacheObject> = new ApolloClient({
  link,
  cache: new InMemoryCache(),
})
