export const typeDefs: string = `#graphql
  type User {
    id: Int!
    name: String
    email: String!
    emailVerified: String
    image: String
    role: String!
    createdAt: String
  }

  type Query {
    health: String!
    users: [User!]!
    user(id: Int!): User
  }

  type Mutation {
    createUser(name: String, email: String!, password: String!): User!
  }
`
