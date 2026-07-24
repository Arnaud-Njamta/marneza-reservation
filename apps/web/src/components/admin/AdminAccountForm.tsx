'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  authMe,
  changeAdminPassword,
  getAdminUser,
  updateAdminProfile,
} from '@/lib/auth';
import type { AuthUser } from '@/types/api';

export function AdminAccountForm() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  useEffect(() => {
    const cached = getAdminUser();
    if (cached) {
      setUser(cached);
      setFirstName(cached.firstName);
      setLastName(cached.lastName);
      setEmail(cached.email);
    }
    authMe()
      .then((u) => {
        setUser(u);
        setFirstName(u.firstName);
        setLastName(u.lastName);
        setEmail(u.email);
      })
      .catch(() => {
        /* gate gère la session */
      });
  }, []);

  async function handleProfile(e: FormEvent) {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    setLoadingProfile(true);
    try {
      const emailChanged = user && email.trim().toLowerCase() !== user.email.toLowerCase();
      const updated = await updateAdminProfile({
        firstName,
        lastName,
        email,
        currentPassword: emailChanged ? currentPasswordForEmail : undefined,
      });
      setUser(updated);
      setCurrentPasswordForEmail('');
      setProfileMsg('Profil mis à jour');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordErr(null);
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordErr('Les mots de passe ne correspondent pas');
      return;
    }
    setLoadingPassword(true);
    try {
      const result = await changeAdminPassword(currentPassword, newPassword);
      setPasswordMsg(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordErr(err instanceof Error ? err.message : 'Changement impossible');
    } finally {
      setLoadingPassword(false);
    }
  }

  const emailChanged = user ? email.trim().toLowerCase() !== user.email.toLowerCase() : false;

  return (
    <div className="admin-account">
      <section className="card admin-account__card">
        <h2 className="admin-account__heading">Identité</h2>
        <p className="admin-account__lead">
          Première connexion : utilisez l&apos;e-mail et le mot de passe initiaux. Vous pouvez ensuite
          les modifier ici à tout moment.
        </p>
        {profileErr && <div className="error-banner">{profileErr}</div>}
        {profileMsg && <div className="success-banner">{profileMsg}</div>}
        <form onSubmit={handleProfile} className="admin-account__form">
          <div className="admin-account__row">
            <div className="form-group">
              <label htmlFor="acc-first">Prénom</label>
              <input
                id="acc-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="acc-last">Nom</label>
              <input
                id="acc-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="acc-email">E-mail de connexion</label>
            <input
              id="acc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          {emailChanged && (
            <div className="form-group">
              <label htmlFor="acc-email-pwd">Mot de passe actuel (confirmation)</label>
              <input
                id="acc-email-pwd"
                type="password"
                value={currentPasswordForEmail}
                onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loadingProfile}>
            {loadingProfile ? 'Enregistrement…' : 'Enregistrer le profil'}
          </button>
        </form>
      </section>

      <section className="card admin-account__card">
        <h2 className="admin-account__heading">Mot de passe</h2>
        <p className="admin-account__lead">
          Minimum 8 caractères. En cas d&apos;oubli, utilisez « Mot de passe oublié » sur la page de
          connexion (code envoyé par e-mail SMTP).
        </p>
        {passwordErr && <div className="error-banner">{passwordErr}</div>}
        {passwordMsg && <div className="success-banner">{passwordMsg}</div>}
        <form onSubmit={handlePassword} className="admin-account__form">
          <div className="form-group">
            <label htmlFor="acc-cur-pwd">Mot de passe actuel</label>
            <input
              id="acc-cur-pwd"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="acc-new-pwd">Nouveau mot de passe</label>
            <input
              id="acc-new-pwd"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="acc-confirm-pwd">Confirmer</label>
            <input
              id="acc-confirm-pwd"
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loadingPassword}>
            {loadingPassword ? 'Enregistrement…' : 'Changer le mot de passe'}
          </button>
        </form>
      </section>
    </div>
  );
}
