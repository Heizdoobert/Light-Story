/**
 * Translates technical error messages into user-friendly Vietnamese notifications.
 */
export const getErrorMessage = (error: any, context?: string): string => {
  const message = error?.message || String(error);
  const lowercaseMessage = message.toLowerCase();

  // Network & Connection Issues
  if (lowercaseMessage.includes('network') || lowercaseMessage.includes('fetch') || lowercaseMessage.includes('internet')) {
    return 'Không thể kết nối với máy chủ. Vui lòng kiểm tra lại đường truyền internet của bạn.';
  }

  // Supabase/Database Specific Errors
  if (lowercaseMessage.includes('pgrst116')) { // JSON single object error
    return 'Dữ liệu không tồn tại hoặc đã bị xóa.';
  }
  
  if (lowercaseMessage.includes('insufficient permissions') || lowercaseMessage.includes('permission denied')) {
    return 'Bạn không có quyền thực hiện hành động này. Vui lòng kiểm tra lại tài khoản.';
  }

  if (lowercaseMessage.includes('duplicate key')) {
    return 'Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.';
  }

  // Auth Specific Errors
  if (lowercaseMessage.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.';
  }

  // Context-based fallbacks
  if (context === 'fetch_stories') return 'Không thể tải danh sách truyện. Vui lòng làm mới trang.';
  if (context === 'save_story') return 'Không thể tạo truyện mới. Vui lòng kiểm tra lại các trường thông tin.';
  if (context === 'update_settings') return 'Không thể cập nhật cấu hình. Vui lòng thử lại sau.';

  return 'Đã có lỗi xảy ra. Vui lòng thử lại sau giây lát.';
};
