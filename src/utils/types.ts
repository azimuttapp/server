export type Uuid = string
export type Email = string
export type UserId = Uuid
export type User = {
    id: UserId
    username: string
    email: Email
    name: string
    avatar: string | null
    bio: string | null
    company: string | null
    location: string | null
    website: string | null
    github: string | null
    twitter: string | null
}
export type Error = {
    statusCode: number
    error: string
    message: string
}
