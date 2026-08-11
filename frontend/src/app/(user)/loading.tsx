export default function UserLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-semibold text-slate-400 animate-pulse">
        Đang tải dữ liệu tài khoản...
      </p>
    </div>
  );
}
