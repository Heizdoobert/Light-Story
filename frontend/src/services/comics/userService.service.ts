import { apiClient } from "@/lib/api/apiClient";

export const userService = {
  /**
   * Tải ảnh đại diện lên hệ thống (Cloudflare R2 / Server storage)
   */
  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    // Gọi đến API endpoint xử lý upload file của dự án
    const response = await apiClient.post<{ url: string; secure_url?: string }>(
      "/api/upload",
      formData,
    );

    // Trả về đường dẫn URL của ảnh sau khi upload thành công
    return response.url || response.secure_url || "";
  },

  /**
   * Cập nhật thông tin chi tiết của người dùng (Nếu cần mở rộng thêm các trường khác)
   */
  async updateProfileDetails(payload: {
    full_name?: string;
    avatar_url?: string | null;
  }) {
    return apiClient.post("/api/user/profile", payload);
  },
};
