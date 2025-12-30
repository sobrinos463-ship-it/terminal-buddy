import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Lock, User, Eye, EyeOff, Loader2, ChevronLeft } from "lucide-react";
import { MobileFrame } from "@/components/layout/MobileFrame";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Mínimo 6 caracteres");
const nameSchema = z.string().min(2, "Mínimo 2 caracteres").optional();

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  // Redirect if already logged in
  if (user) {
    const from = (location.state as any)?.from?.pathname || "/dashboard";
    navigate(from, { replace: true });
    return null;
  }

  const validate = () => {
    const newErrors: { email?: string; password?: string; name?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (!isLogin && fullName) {
      const nameResult = nameSchema.safeParse(fullName);
      if (!nameResult.success) {
        newErrors.name = nameResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast({
              variant: "destructive",
              title: "Credenciales incorrectas",
              description: "Email o contraseña incorrectos. Inténtalo de nuevo.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Error de inicio de sesión",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "¡Bienvenido de vuelta!",
            description: "Has iniciado sesión correctamente.",
          });
          navigate("/dashboard");
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              variant: "destructive",
              title: "Email ya registrado",
              description: "Este email ya tiene una cuenta. Intenta iniciar sesión.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Error de registro",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "¡Cuenta creada!",
            description: "Bienvenido a FitAI Coach. ¡Vamos a entrenar!",
          });
          navigate("/onboarding");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 animate-pulse-glow">
            <Zap className="w-8 h-8 text-primary-foreground fill-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">FitAI Coach</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLogin ? "Bienvenido de vuelta, máquina" : "Únete a la comunidad fitness"}
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="flex bg-muted rounded-xl p-1 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              !isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium mb-2">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full bg-muted/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-muted/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-muted/50 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? "Entrar" : "Crear cuenta"}
                <Zap className="w-4 h-4 fill-current" />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Al continuar, aceptas nuestros términos de servicio y política de privacidad.
        </p>
      </div>
    </MobileFrame>
  );
}
