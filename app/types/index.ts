export interface RequestAccessFormData {
  team: string;
  usecase: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export interface GitHubUser {
  login: string
  name: string
  email: string
  avatar_url: string
  html_url: string
  sig: string
}
