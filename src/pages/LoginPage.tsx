import { useEffect, useState, type FormEvent } from 'react';
import heroImage from '../assets/hero.png';
import type { LoginPayload } from '../entities/auth/model/types';
import { PrimaryButton } from '../shared/ui/PrimaryButton';

interface LoginPageProps {
  isLoading: boolean;
  error: string | null;
  onLogin: (payload: LoginPayload) => Promise<unknown>;
}

export function LoginPage({ isLoading, error, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    document.body.classList.add('login-no-scroll');
    return () => {
      document.body.classList.remove('login-no-scroll');
    };
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onLogin({ email, password });
  };

  return (
    <main className="screen login-screen">
      <section className="card login-card">
        <div className="login-layout">
          <aside
            className="login-visual"
            style={{ backgroundImage: `linear-gradient(180deg, rgba(10, 166, 196, 0.62), rgba(5, 130, 160, 0.7)), url(${heroImage})` }}
          >
            <p className="login-visual__text">
              Suivi patient, quiz sante et parcours renal au meme endroit.
            </p>
          </aside>

          <div className="login-form-panel">
            <h2 className="screen-title">
              Bienvenue sur <span className="brand-gradient">AKACare</span>
            </h2>

            <form className="login-form" onSubmit={onSubmit}>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="awa.diallo@akacare.app"
                />
              </label>

              <label>
                Mot de passe
                <span className="input-with-action">
                  <input
                    required
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                  />
                  <button
                    type="button"
                    className="input-action-button"
                    aria-label={isPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={isPasswordVisible}
                    onClick={() => setIsPasswordVisible((value) => !value)}
                  >
                    👁️
                  </button>
                </span>
              </label>

              {error ? <p className="error-text">{error}</p> : null}

              <PrimaryButton type="submit" disabled={isLoading} wide>
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </PrimaryButton>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
