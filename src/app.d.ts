type AppSession = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
} | null;

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      session: AppSession;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
