import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { TrendingUp, Shield, BarChart3 } from 'lucide-react';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', fullName: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginData.email, loginData.password);

    if (error) {
      toast.error(error.message || 'Erro ao fazer login');
    } else {
      toast.success('Login realizado com sucesso!');
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!signupData.fullName || !signupData.email || !signupData.password) {
      toast.error('Preencha todos os campos');
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);

    if (error) {
      toast.error(error.message || 'Erro ao criar conta');
    } else {
      toast.success('Conta criada com sucesso!');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden md:flex flex-col space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              FinanceFlow
            </h1>
            <p className="text-xl text-muted-foreground">
              Gestão financeira premium para investidores inteligentes
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4 glass p-6 rounded-xl">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Múltiplas Carteiras</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie todos os seus investimentos em um só lugar
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 glass p-6 rounded-xl">
              <div className="p-3 bg-secondary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Análises Avançadas</h3>
                <p className="text-sm text-muted-foreground">
                  Rebalanceamento inteligente e projeções personalizadas
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 glass p-6 rounded-xl">
              <div className="p-3 bg-success/10 rounded-lg">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Seguro & Privado</h3>
                <p className="text-sm text-muted-foreground">
                  Seus dados protegidos com criptografia de ponta
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Forms */}
        <Card className="glass border-border/50 shadow-glow-primary">
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>Entre ou crie sua conta para começar</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Criando...' : 'Criar Conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
