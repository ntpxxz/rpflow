// app/(auth)/layout.tsx
import "../globals.css"; // ตรวจสอบ path ให้ตรงกับ globals.css ของคุณ

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      {/* Background Pattern (Optional) */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fb923c 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>
      
      <div className="z-10 w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}