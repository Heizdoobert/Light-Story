import { SupabaseCategoryRepository } from "./repositories/SupabaseCategoryRepository";
const repo = new SupabaseCategoryRepository();
export async function fetchCategories() {
  return repo.getCategories();
}
export default {
  fetchCategories,
};