import {Email, Uuid} from "@/types/basics";

export type UserId = Uuid
export type User = {
    id: UserId
    email: Email
    username: string
    name: string
    avatar: string | null
    bio: string | null
    company: string | null
    location: string | null
    website: string | null
    github: string | null
    twitter: string | null
}
export type UserBody = Omit<User, 'id' | 'email'>
