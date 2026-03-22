import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import { client } from './lib/apollo'
import { SessionProvider } from 'next-auth/react'
import App from './App.tsx'
import './index.css'

console.info('🚀 React Application Mounting...')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionProvider basePath="/api/auth" refetchInterval={0}>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </SessionProvider>
  </React.StrictMode>,
)
