'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  confirmIdentifier,
  forgotIdentifier,
  forgotPassword,
  loginAdmin,
  resetPassword,
} from '@/lib/auth';

type Mode = 'login' | 'forgot-password' | 'forgot-identifier';
type Step = 'form' | 'code' | 'done';

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';
  const modeParam = searchParams.get('mode');

  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('form');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revealedEmails, setRevealedEmails] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (modeParam === 'forgot-password' || modeParam === 'forgot-identifier') {
      setMode(modeParam);
      setStep('form');
    }
  }, [modeParam]);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setStep('form');
    setError(null);
    setInfo(null);
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setRevealedEmails([]);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginAdmin(email, password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPasswordRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      setInfo(result.message);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword(email, code, newPassword);
      setInfo(result.message);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réinitialisation impossible');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotIdentifierRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const result = await forgotIdentifier(recoveryEmail);
      setInfo(result.message);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmIdentifier(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await confirmIdentifier(recoveryEmail, code);
      setInfo(result.message);
      setRevealedEmails(result.loginEmails || []);
      if (result.loginEmails?.[0]) setEmail(result.loginEmails[0]);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vérification impossible');
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === 'login'
      ? null
      : mode === 'forgot-password'
        ? 'Mot de passe oublié'
        : 'Identifiant oublié';

  return (
    <div className="card admin-login-card">
      {title && (
        <div className="admin-login-recovery__header">
          <h2 className="admin-login-recovery__title">{title}</h2>
          {mode === 'forgot-password' && step === 'form' && (
            <p className="admin-login-recovery__hint">
              Saisissez l&apos;e-mail de votre compte. Un code à 6 chiffres vous sera envoyé.
            </p>
          )}
          {mode === 'forgot-password' && step === 'code' && (
            <p className="admin-login-recovery__hint">
              Entrez le code reçu par e-mail, puis choisissez un nouveau mot de passe.
            </p>
          )}
          {mode === 'forgot-identifier' && step === 'form' && (
            <p className="admin-login-recovery__hint">
              Indiquez votre e-mail de connexion ou l&apos;adresse de notification admin
              (celle qui reçoit les alertes réservations). Un code de vérification sera envoyé.
            </p>
          )}
          {mode === 'forgot-identifier' && step === 'code' && (
            <p className="admin-login-recovery__hint">
              Entrez le code reçu pour afficher votre identifiant de connexion.
            </p>
          )}
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}
      {info && <div className="success-banner">{info}</div>}

      {mode === 'login' && (
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>

          <div className="admin-login-links">
            <button type="button" className="admin-login-link" onClick={() => switchMode('forgot-password')}>
              Mot de passe oublié ?
            </button>
            <button type="button" className="admin-login-link" onClick={() => switchMode('forgot-identifier')}>
              Identifiant oublié ?
            </button>
          </div>
        </form>
      )}

      {mode === 'forgot-password' && step === 'form' && (
        <form onSubmit={handleForgotPasswordRequest}>
          <div className="form-group">
            <label htmlFor="fp-email">E-mail du compte</label>
            <input
              id="fp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Envoi…' : 'Envoyer le code'}
          </button>
          <button type="button" className="admin-login-back" onClick={() => switchMode('login')}>
            ← Retour à la connexion
          </button>
        </form>
      )}

      {mode === 'forgot-password' && step === 'code' && (
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label htmlFor="fp-code">Code à 6 chiffres</label>
            <input
              id="fp-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
            />
          </div>
          <div className="form-group">
            <label htmlFor="fp-new">Nouveau mot de passe</label>
            <input
              id="fp-new"
              type="password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="fp-confirm">Confirmer le mot de passe</label>
            <input
              id="fp-confirm"
              type="password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}
          </button>
          <button type="button" className="admin-login-back" onClick={() => switchMode('login')}>
            ← Retour à la connexion
          </button>
        </form>
      )}

      {mode === 'forgot-password' && step === 'done' && (
        <div className="admin-login-done">
          <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => switchMode('login')}>
            Se connecter
          </button>
        </div>
      )}

      {mode === 'forgot-identifier' && step === 'form' && (
        <form onSubmit={handleForgotIdentifierRequest}>
          <div className="form-group">
            <label htmlFor="fi-email">E-mail de récupération</label>
            <input
              id="fi-email"
              type="email"
              required
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Envoi…' : 'Envoyer le code'}
          </button>
          <button type="button" className="admin-login-back" onClick={() => switchMode('login')}>
            ← Retour à la connexion
          </button>
        </form>
      )}

      {mode === 'forgot-identifier' && step === 'code' && (
        <form onSubmit={handleConfirmIdentifier}>
          <div className="form-group">
            <label htmlFor="fi-code">Code à 6 chiffres</label>
            <input
              id="fi-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Vérification…' : 'Afficher mon identifiant'}
          </button>
          <button type="button" className="admin-login-back" onClick={() => switchMode('login')}>
            ← Retour à la connexion
          </button>
        </form>
      )}

      {mode === 'forgot-identifier' && step === 'done' && (
        <div className="admin-login-done">
          {revealedEmails.length > 0 && (
            <div className="admin-login-reveal">
              <p className="admin-login-reveal__label">Identifiant de connexion</p>
              {revealedEmails.map((e) => (
                <code key={e} className="admin-login-reveal__email">
                  {e}
                </code>
              ))}
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => switchMode('login')}
          >
            Se connecter
          </button>
        </div>
      )}
    </div>
  );
}
