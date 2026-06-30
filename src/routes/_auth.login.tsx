import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  CalendarClock,
  Wallet,
  CalendarCheck,
  Users,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { authApi } from "@/services/auth.service";
import logo from "@/assets/cybernaut-logo.png";

export const Route = createFileRoute("/_auth/login")({
  component: LoginPage,
});

const FEATURES = [
  { icon: Briefcase, label: "Project Management" },
  { icon: CalendarCheck, label: "Attendance" },
  { icon: Wallet, label: "Payroll" },
  { icon: CalendarClock, label: "Leave Management" },
  { icon: Users, label: "HR Operations" },
];

function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await authApi.login(email, password);
      dispatch(
        setCredentials({
          user: session.user,
          token: session.tokens.accessToken,
          remember,
        }),
      );
      navigate({ to: "/dashboard" });
      return;
    } catch (err) {
      const message =
        (axios.isAxiosError(err) && (err.response?.data?.message as string)) ||
        (axios.isAxiosError(err) && !err.response
          ? "Unable to reach the server. Please try again."
          : "Invalid email or password.");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[45fr_55fr]">
      {/* LEFT — brand panel */}
      <div className="relative hidden overflow-hidden lg:block">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#3B82F6]" />
        {/* Soft glows */}
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#60a5fa]/40 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:42px_42px]" />

        {/* Floating orbs */}
        <motion.div
          className="absolute right-20 top-24 h-24 w-24 rounded-3xl bg-white/10 backdrop-blur-md ring-1 ring-white/20"
          animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-40 left-16 h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20"
          animate={{ y: [0, 12, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-1.5 shadow-lg">
              <img src={logo} alt="Cybernaut" className="h-full w-full object-contain" />
            </div>
            <div className="text-lg font-semibold tracking-tight">Cybernaut</div>
          </motion.div>

          {/* Hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="max-w-lg"
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Enterprise Workspace
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Welcome to <br />
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Cybernaut Minutos ERP
              </span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/80 xl:text-lg">
              Manage employees, departments, projects, attendance, payroll and
              operations from one intelligent workspace.
            </p>

            {/* Feature chips */}
            <div className="mt-8 flex flex-wrap gap-2.5">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 + i * 0.07 }}
                  className="group inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-medium backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/15">
                    <f.icon className="h-3.5 w-3.5" />
                  </span>
                  {f.label}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} Cybernaut Technologies
          </p>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:py-12">
        {/* Soft gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F8FAFC] via-[#F0F7FF] to-[#E8F4FF]" />
        {/* Abstract blobs */}
        <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-[#60A5FA]/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#93C5FD]/10 blur-3xl" />
        {/* Mobile decorative top gradient */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#3B82F6]/10 to-transparent lg:hidden" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 flex w-full max-w-md flex-col items-center"
        >
          {/* Branding hero */}
          <div className="flex w-full flex-col items-center justify-center">
            {/* Logo card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white p-6 shadow-[0_12px_40px_-12px_rgba(59,130,246,0.22)] ring-1 ring-[#E5E7EB]/60 sm:h-[120px] sm:w-[120px] sm:p-6"
            >
              <img
                src={logo}
                alt="Cybernaut"
                className="h-14 w-14 object-contain sm:h-20 sm:w-20"
              />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-center font-sans text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]"
            >
              Cybernaut Minutos ERP
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-3 text-center text-sm font-medium text-slate-500 sm:text-[15px]"
            >
              Sign in to your workspace
            </motion.p>
          </div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-10 w-full rounded-[28px] border border-[#E5E7EB] bg-white p-7 shadow-[0_20px_60px_-15px_rgba(59,130,246,0.16)] sm:p-9"
          >
            {error && (
              <Alert variant="destructive" className="mb-5 rounded-2xl border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#3B82F6]" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 rounded-2xl border-[#E5E7EB] bg-white pl-11 text-sm shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-[#3B82F6] focus-visible:ring-4 focus-visible:ring-[#3B82F6]/15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#3B82F6]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 rounded-2xl border-[#E5E7EB] bg-white pl-11 pr-11 text-sm shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-[#3B82F6] focus-visible:ring-4 focus-visible:ring-[#3B82F6]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                    disabled={loading}
                    className="h-4 w-4 rounded border-[#E5E7EB] data-[state=checked]:bg-[#3B82F6] data-[state=checked]:border-[#3B82F6]"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm font-medium text-[#3B82F6] transition-colors hover:text-[#2563eb] hover:underline underline-offset-2"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="group relative h-12 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#2563eb] text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(59,130,246,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_15px_40px_-10px_rgba(59,130,246,0.7)] active:translate-y-0 disabled:opacity-90"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>

              {loading && (
                <div className="space-y-2 pt-1">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#60a5fa]"
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Verifying your credentials securely
                  </p>
                </div>
              )}
            </form>
          </motion.div>

          {/* Footer */}
          <div className="mt-6 flex w-full items-center justify-between px-2 text-xs text-slate-500">
            <span>v1.0.0</span>
            <span className="inline-flex items-center gap-1">
              Powered by
              <span className="font-semibold text-slate-700">Cybernaut</span>
            </span>
          </div>
        </motion.div>
      </div>

      {/* Forgot password — informational dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#3B82F6] ring-1 ring-blue-100">
              <Info className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Reset your password</DialogTitle>
            <DialogDescription className="text-center">
              Please contact your administrator to reset your password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setForgotOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => setForgotOpen(false)}
              className="bg-[#3B82F6] hover:bg-[#2563eb]"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
