import { api } from "@/lib/api";

export async function getListings() {
  return api<{ items: any[] }>("/api/listings");
}
